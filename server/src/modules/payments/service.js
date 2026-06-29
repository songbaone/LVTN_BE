const { db } = require('../../database/connection');
const { TABLES, PAYMENT_STATUS } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');

function parsePaymentId(paymentId) {
  const id = parseInt(paymentId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid payment ID', 400);
  }

  return id;
}

async function ensurePaymentExists(paymentId, trx = db) {
  const payment = await trx(TABLES.PAYMENTS).where({ payment_id: paymentId }).first();

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  return payment;
}

function applyListFilters(query, filters) {
  if (filters.payment_status) {
    query.where('p.payment_status', filters.payment_status);
  }

  if (filters.order_id) {
    query.where('p.order_id', filters.order_id);
  }

  return query;
}

async function getPayments(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    payment_status: queryParams.payment_status,
    order_id: queryParams.order_id,
  };

  let countQuery = db(`${TABLES.PAYMENTS} as p`)
  .join(`${TABLES.ORDERS} as o`, 'p.order_id', 'o.order_id')
  .join(`${TABLES.USERS} as u`, 'o.user_id', 'u.user_id');
  
  countQuery = applyListFilters(countQuery, filters);
  const countResult = await countQuery.count({
  total: 'p.payment_id'
});
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(`${TABLES.PAYMENTS} as p`)
    .join(`${TABLES.ORDERS} as o`, 'p.order_id', 'o.order_id')
    .join(`${TABLES.USERS} as u`, 'o.user_id', 'u.user_id')
    .select(
      'p.payment_id',
      'p.order_id',
      'o.order_code',
      'u.full_name as customer_name',

      'o.payment_method',

      'p.payment_status',
      'p.amount',

      'p.paid_at',
      'o.created_at'
    )

  listQuery = applyListFilters(listQuery, filters);

  const payments = await listQuery
    .orderBy('o.created_at', 'desc')
    .offset(offset)
    .limit(limit);

  return {
    payments: payments.map((payment) => ({
      payment_id: payment.payment_id,
      order_id: payment.order_id,
      order_code: payment.order_code,
      customer_name: payment.customer_name,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      amount: parseFloat(payment.amount),
      created_at: payment.created_at,
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getPaymentById(paymentIdParam) {
  const paymentId = parsePaymentId(paymentIdParam);
  const payment = await ensurePaymentExists(paymentId);

  const order = await db(TABLES.ORDERS)
    .where({ order_id: payment.order_id })
    .first();

  const user = await db(TABLES.USERS)
    .where({ user_id: order.user_id })
    .first();

  return {
    payment_id: payment.payment_id,
    order_id: payment.order_id,
    order_code: order.order_code,
    customer: {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
    },
    payment_method: payment.payment_method,
    payment_status: payment.payment_status,
    amount: parseFloat(payment.amount),
    created_at: payment.created_at,
    order_summary: {
      total_amount: parseFloat(order.total_amount),
      discount_amount: parseFloat(order.discount_amount),
      shipping_fee: parseFloat(order.shipping_fee),
      final_amount: parseFloat(order.final_amount),
    },
  };
}

async function updatePaymentStatus(paymentIdParam, paymentStatus) {
  const paymentId = parsePaymentId(paymentIdParam);

  await db.transaction(async (trx) => {
    const payment = await ensurePaymentExists(paymentId, trx);

    if (!Object.values(PAYMENT_STATUS).includes(paymentStatus)) {
      throw new AppError('Invalid payment status', 400);
    }

    await trx(TABLES.PAYMENTS)
      .where({ payment_id: paymentId })
      .update({ payment_status: paymentStatus });

    await trx(TABLES.ORDERS)
      .where({ order_id: payment.order_id })
      .update({ payment_status: paymentStatus });
  });

  return await getPaymentById(paymentId);
}

async function confirmPayment(userId, orderCode) {
  if (!orderCode || typeof orderCode !== 'string' || !orderCode.trim()) {
    throw new AppError('Order code is required', 400);
  }

  return await db.transaction(async (trx) => {
    // 1. Find the payment by joining with the order to verify ownership
    const payment = await trx(`${TABLES.PAYMENTS} as p`)
      .join(`${TABLES.ORDERS} as o`, 'p.order_id', 'o.order_id')
      .where('o.order_code', orderCode.trim())
      .select('p.*', 'o.user_id', 'o.order_code')
      .first();

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // 2. Ensure the payment/order belongs to the authenticated user
    if (payment.user_id !== userId) {
      throw new AppError('Payment not found', 404);
    }

    // 3. Only allow updating Pending payments
    if (payment.payment_status !== PAYMENT_STATUS.PENDING) {
      throw new AppError(
        `Cannot confirm payment with status ${payment.payment_status}`,
        400
      );
    }

    // 4. Update payment status to Paid with timestamp
    await trx(TABLES.PAYMENTS)
      .where({ payment_id: payment.payment_id })
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: trx.fn.now(),
      });

    // 5. Sync the order's payment status
    await trx(TABLES.ORDERS)
      .where({ order_id: payment.order_id })
      .update({ payment_status: PAYMENT_STATUS.PAID });

    return {
      payment_id: payment.payment_id,
      order_id: payment.order_id,
      order_code: payment.order_code,
      payment_status: PAYMENT_STATUS.PAID,
      paid_at: new Date().toISOString(),
      amount: parseFloat(payment.amount),
    };
  });
}

module.exports = {
  getPayments,
  getPaymentById,
  updatePaymentStatus,
  confirmPayment,
};
