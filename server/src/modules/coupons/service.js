const { db } = require('../../database/connection');
const { TABLES, COUPON_DISCOUNT_TYPE } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');

const COUPON_COLUMNS = [
  'coupon_id',
  'coupon_code',
  'coupon_name',
  'discount_type',
  'discount_value',
  'min_order_value',
  'start_date',
  'end_date',
  'quantity',
  'status',
  'created_at',
  'updated_at',
];

function parseCouponId(couponId) {
  const id = parseInt(couponId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid coupon ID', 400);
  }

  return id;
}

function mapCoupon(record) {
  if (!record) {
    return null;
  }

  return {
    coupon_id: record.coupon_id,
    coupon_code: record.coupon_code,
    coupon_name: record.coupon_name,
    discount_type: record.discount_type,
    discount_value: parseFloat(record.discount_value),
    min_order_value: record.min_order_value ? parseFloat(record.min_order_value) : null,
    start_date: record.start_date,
    end_date: record.end_date,
    quantity: record.quantity,
    status: Boolean(record.status),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function applyListFilters(query, filters) {
  if (filters.coupon_code) {
    query.where('coupon_code', 'like', `%${filters.coupon_code}%`);
  }

  if (filters.status !== undefined && filters.status !== null) {
    query.where('status', filters.status);
  }

  return query;
}

async function ensureCouponExists(couponId) {
  const coupon = await db(TABLES.COUPONS).where({ coupon_id: couponId }).first();

  if (!coupon) {
    throw new AppError('Coupon not found', 404);
  }

  return coupon;
}

async function ensureCouponCodeAvailable(couponCode, excludeId = null) {
  const query = db(TABLES.COUPONS).where({ coupon_code: couponCode });

  if (excludeId) {
    query.whereNot({ coupon_id: excludeId });
  }

  const existing = await query.first();

  if (existing) {
    throw new AppError('Coupon code already exists', 409);
  }
}

async function validateCouponForUse(couponCode, orderAmount) {
  const coupon = await db(TABLES.COUPONS)
    .where({ coupon_code: couponCode })
    .first();

  if (!coupon) {
    throw new AppError('Coupon not found', 404);
  }

  if (!coupon.status) {
    throw new AppError('Coupon is inactive', 400);
  }

  const now = new Date();

  if (coupon.start_date && new Date(coupon.start_date) > now) {
    throw new AppError('Coupon is not yet valid', 400);
  }

  if (coupon.end_date && new Date(coupon.end_date) < now) {
    throw new AppError('Coupon has expired', 400);
  }

  if (coupon.quantity !== null && coupon.quantity <= 0) {
    throw new AppError('Coupon usage limit has been exceeded', 400);
  }

  if (coupon.min_order_value && orderAmount < coupon.min_order_value) {
    throw new AppError(
      `Minimum order value of ${coupon.min_order_value} is required to use this coupon`,
      400
    );
  }

  return coupon;
}

function calculateDiscount(coupon, orderAmount) {
  
  const discountType = coupon.discount_type.toUpperCase();
  const discountValue = parseFloat(coupon.discount_value);
console.log(COUPON_DISCOUNT_TYPE);
  let discountAmount;

  if (discountType === COUPON_DISCOUNT_TYPE.PERCENT) {
    discountAmount = (orderAmount * discountValue) / 100;
  } else if (discountType === COUPON_DISCOUNT_TYPE.FIXED) {
    discountAmount = discountValue;
  } else {
    throw new AppError('Invalid discount type', 400);
  }

  if (discountAmount > orderAmount) {
    discountAmount = orderAmount;
  }

  return discountAmount;
}

async function getCoupons(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    coupon_code: queryParams.coupon_code?.trim() || null,
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
  };

  let countQuery = db(TABLES.COUPONS);
  countQuery = applyListFilters(countQuery, filters);
  const countResult = await countQuery.count({ total: 'coupon_id' });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(TABLES.COUPONS).select(COUPON_COLUMNS);
  listQuery = applyListFilters(listQuery, filters);

  const coupons = await listQuery
    .orderBy('created_at', 'desc')
    .offset(offset)
    .limit(limit);

  return {
    coupons: coupons.map(mapCoupon),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getCouponById(couponIdParam) {
  const couponId = parseCouponId(couponIdParam);
  const coupon = await ensureCouponExists(couponId);

  return mapCoupon(coupon);
}

async function createCoupon(data) {
  const {
    coupon_code,
    coupon_name,
    discount_type,
    discount_value,
    min_order_value,
    start_date,
    end_date,
    quantity,
    status,
  } = data;

  await ensureCouponCodeAvailable(coupon_code);

  const insertData = {
    coupon_code,
    coupon_name,
    discount_type: discount_type.toUpperCase(),
    discount_value,
    min_order_value: min_order_value || null,
    start_date: start_date || null,
    end_date: end_date || null,
    quantity: quantity !== undefined ? quantity : null,
    status: status !== undefined ? parseInt(status, 10) : 1,
  };

  await db(TABLES.COUPONS).insert(insertData);

  const coupon = await db(TABLES.COUPONS).where({ coupon_code }).first();

  return getCouponById(coupon.coupon_id);
}

async function updateCoupon(couponIdParam, data) {
  const couponId = parseCouponId(couponIdParam);
  await ensureCouponExists(couponId);

  const updateData = {};

  if (data.coupon_code !== undefined) {
    await ensureCouponCodeAvailable(data.coupon_code, couponId);
    updateData.coupon_code = data.coupon_code;
  }

  if (data.coupon_name !== undefined) {
    updateData.coupon_name = data.coupon_name;
  }

  if (data.discount_type !== undefined) {
    updateData.discount_type = data.discount_type.toUpperCase();
  }

  if (data.discount_value !== undefined) {
    updateData.discount_value = data.discount_value;
  }

  if (data.min_order_value !== undefined) {
    updateData.min_order_value = data.min_order_value || null;
  }

  if (data.start_date !== undefined) {
    updateData.start_date = data.start_date || null;
  }

  if (data.end_date !== undefined) {
    updateData.end_date = data.end_date || null;
  }

  if (data.quantity !== undefined) {
    updateData.quantity = data.quantity;
  }

  if (data.status !== undefined) {
    updateData.status = parseInt(data.status, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  await db(TABLES.COUPONS).where({ coupon_id: couponId }).update(updateData);

  return getCouponById(couponId);
}

async function deleteCoupon(couponIdParam) {
  const couponId = parseCouponId(couponIdParam);
  await ensureCouponExists(couponId);

  await db(TABLES.COUPONS).where({ coupon_id: couponId }).update({ status: 0 });

  return getCouponById(couponId);
}

async function validateCoupon(couponCode, orderAmount) {
  const coupon = await validateCouponForUse(couponCode, orderAmount);
  const discountAmount = calculateDiscount(coupon, orderAmount);
  const finalAmount = orderAmount - discountAmount;

  return {
    valid: true,
    coupon: mapCoupon(coupon),
    discount_amount: discountAmount,
    final_amount: finalAmount,
  };
}

async function applyCoupon(couponCode, orderAmount) {
  const coupon = await validateCouponForUse(couponCode, orderAmount);
  const discountAmount = calculateDiscount(coupon, orderAmount);
  const finalAmount = orderAmount - discountAmount;

  return {
    valid: true,
    coupon: mapCoupon(coupon),
    discount_amount: discountAmount,
    final_amount: finalAmount,
  };
}

module.exports = {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
};
