const { db } = require('../../database/connection');
const { TABLES, ORDER_STATUS } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');

const REVIEW_COLUMNS = [
  'review_id',
  'product_id',
  'user_id',
  'rating',
  'comment',
  'created_at',
];

function parseReviewId(reviewId) {
  const id = parseInt(reviewId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid review ID', 400);
  }

  return id;
}

function mapReview(record) {
  if (!record) {
    return null;
  }

  return {
    review_id: record.review_id,
    product_id: record.product_id,
    user_id: record.user_id,
    rating: Number(record.rating),
    comment: record.comment ?? null,
    created_at: record.created_at,
  };
}

async function ensureProductExists(productId, trx = db) {
  const product = await trx(TABLES.PRODUCTS)
    .where({ product_id: productId })
    .first();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
}

async function ensureReviewExists(reviewId, trx = db) {
  const review = await trx(TABLES.REVIEWS)
    .where({ review_id: reviewId })
    .first();

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  return review;
}

async function ensureUserOwnsReview(userId, reviewId, trx = db) {
  const review = await trx(TABLES.REVIEWS)
    .where({ review_id: reviewId, user_id: userId })
    .first();

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  return review;
}

async function ensureUserPurchasedProduct(userId, productId, trx = db) {
  // Check if user has a delivered order containing this product
  const orderDetail = await trx(TABLES.ORDER_DETAILS)
    .join(
      TABLES.ORDERS,
      `${TABLES.ORDER_DETAILS}.order_id`,
      `${TABLES.ORDERS}.order_id`,
    )
    .join(
      TABLES.PRODUCT_VARIANTS,
      `${TABLES.ORDER_DETAILS}.variant_id`,
      `${TABLES.PRODUCT_VARIANTS}.variant_id`,
    )
    .where(`${TABLES.ORDERS}.user_id`, userId)
    .where(`${TABLES.ORDERS}.order_status`, ORDER_STATUS.DELIVERED)
    .where(`${TABLES.PRODUCT_VARIANTS}.product_id`, productId)
    .first();

  if (!orderDetail) {
    throw new AppError(
      'You can only review products you have purchased and received',
      403,
    );
  }

  return true;
}

async function ensureUserHasNotReviewedProduct(userId, productId, trx = db) {
  const existing = await trx(TABLES.REVIEWS)
    .where({ user_id: userId, product_id: productId })
    .first();

  if (existing) {
    throw new AppError('You have already reviewed this product', 409);
  }

  return true;
}

async function createReview(userId, data) {
  const { product_id, rating, comment } = data;

  return db.transaction(async (trx) => {
    await ensureProductExists(product_id, trx);
    await ensureUserPurchasedProduct(userId, product_id, trx);
    await ensureUserHasNotReviewedProduct(userId, product_id, trx);

    const insertData = {
      product_id,
      user_id: userId,
      rating,
      comment: comment ?? null,
    };

    await trx(TABLES.REVIEWS).insert(insertData);

    const review = await trx(TABLES.REVIEWS)
      .where({ user_id: userId, product_id })
      .first();

    return mapReview(review);
  });
}

async function updateReview(userId, reviewIdParam, data) {
  const reviewId = parseReviewId(reviewIdParam);

  return db.transaction(async (trx) => {
    await ensureUserOwnsReview(userId, reviewId, trx);

    const updateData = {};

    if (data.rating !== undefined) {
      updateData.rating = data.rating;
    }

    if (data.comment !== undefined) {
      updateData.comment = data.comment || null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    await trx(TABLES.REVIEWS)
      .where({ review_id: reviewId })
      .update(updateData);

    const review = await trx(TABLES.REVIEWS)
      .where({ review_id: reviewId })
      .first();

    return mapReview(review);
  });
}

async function deleteReview(userId, reviewIdParam) {
  const reviewId = parseReviewId(reviewIdParam);

  return db.transaction(async (trx) => {
    await ensureUserOwnsReview(userId, reviewId, trx);

    await trx(TABLES.REVIEWS).where({ review_id: reviewId }).del();

    return { review_id: reviewId };
  });
}

async function getMyReviews(userId, queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const countResult = await db(TABLES.REVIEWS)
    .where({ user_id: userId })
    .count({ total: 'review_id' });

  const total = Number(countResult[0]?.total ?? 0);

  const reviews = await db(TABLES.REVIEWS)
    .join(
      TABLES.PRODUCTS,
      `${TABLES.REVIEWS}.product_id`,
      `${TABLES.PRODUCTS}.product_id`,
    )
    .select(
      `${TABLES.REVIEWS}.review_id`,
      `${TABLES.REVIEWS}.product_id`,
      `${TABLES.REVIEWS}.rating`,
      `${TABLES.REVIEWS}.comment`,
      `${TABLES.REVIEWS}.created_at`,
      `${TABLES.PRODUCTS}.product_name`,
    )
    .where(`${TABLES.REVIEWS}.user_id`, userId)
    .orderBy(`${TABLES.REVIEWS}.created_at`, 'desc')
    .offset(offset)
    .limit(limit);

  return {
    reviews: reviews.map((review) => ({
      review_id: review.review_id,
      product_id: review.product_id,
      product_name: review.product_name,
      rating: Number(review.rating),
      comment: review.comment ?? null,
      created_at: review.created_at,
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getProductReviews(productId, queryParams) {
  const productIdNum = parseInt(productId, 10);
  await ensureProductExists(productIdNum);

  const { page, limit, offset } = getPagination(queryParams);
  const { rating } = queryParams;

  let countQuery = db(TABLES.REVIEWS).where({ product_id: productIdNum });

  if (rating) {
    countQuery = countQuery.where({ rating: parseInt(rating, 10) });
  }

  const countResult = await countQuery.count({ total: 'review_id' });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(TABLES.REVIEWS)
    .join(
      TABLES.USERS,
      `${TABLES.REVIEWS}.user_id`,
      `${TABLES.USERS}.user_id`,
    )
    .select(
      `${TABLES.REVIEWS}.review_id`,
      `${TABLES.REVIEWS}.user_id`,
      `${TABLES.REVIEWS}.rating`,
      `${TABLES.REVIEWS}.comment`,
      `${TABLES.REVIEWS}.created_at`,
      `${TABLES.USERS}.full_name`,
    )
    .where(`${TABLES.REVIEWS}.product_id`, productIdNum);

  if (rating) {
    listQuery = listQuery.where(`${TABLES.REVIEWS}.rating`, parseInt(rating, 10));
  }

  const reviews = await listQuery
    .orderBy(`${TABLES.REVIEWS}.created_at`, 'desc')
    .offset(offset)
    .limit(limit);

  return {
    reviews: reviews.map((review) => ({
      review_id: review.review_id,
      user_id: review.user_id,
      full_name: review.full_name,
      rating: Number(review.rating),
      comment: review.comment ?? null,
      created_at: review.created_at,
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getProductReviewSummary(productId) {
  const productIdNum = parseInt(productId, 10);
  const product = await ensureProductExists(productIdNum);

  const stats = await db(TABLES.REVIEWS)
    .select(
      db.raw('COUNT(*) AS total_reviews'),
      db.raw('CAST(ROUND(AVG(CAST(rating AS DECIMAL(10, 2))), 1) AS DECIMAL(10, 1)) AS average_rating'),
    )
    .where({ product_id: productIdNum })
    .first();

  const breakdown = await db(TABLES.REVIEWS)
    .select('rating')
    .count({ count: 'review_id' })
    .where({ product_id: productIdNum })
    .groupBy('rating');

  const ratingBreakdown = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  breakdown.forEach((row) => {
    ratingBreakdown[row.rating] = Number(row.count);
  });

  return {
    product_id: productIdNum,
    product_name: product.product_name,
    total_reviews: Number(stats?.total_reviews ?? 0),
    average_rating: stats?.average_rating
      ? parseFloat(stats.average_rating)
      : 0,
    rating_breakdown: ratingBreakdown,
  };
}

async function getAdminReviews(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);
  const { search, product_id, rating } = queryParams;

  let countQuery = db(`${TABLES.REVIEWS} as r`)
    .join(`${TABLES.PRODUCTS} as p`, 'r.product_id', 'p.product_id')
    .join(`${TABLES.USERS} as u`, 'r.user_id', 'u.user_id');

  if (search) {
    countQuery = countQuery.where(function () {
      this.where('p.product_name', 'like', `%${search}%`)
        .orWhere('u.full_name', 'like', `%${search}%`);
    });
  }

  if (product_id) {
    countQuery = countQuery.where('r.product_id', parseInt(product_id, 10));
  }

  if (rating) {
    countQuery = countQuery.where('r.rating', parseInt(rating, 10));
  }

  const countResult = await countQuery.count({ total: 'r.review_id' });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(`${TABLES.REVIEWS} as r`)
    .join(`${TABLES.PRODUCTS} as p`, 'r.product_id', 'p.product_id')
    .join(`${TABLES.USERS} as u`, 'r.user_id', 'u.user_id')
    .select(
      'r.review_id',
      'r.rating',
      'r.comment',
      'r.created_at',
      'p.product_id',
      'p.product_name',
      'u.user_id',
      'u.full_name as user_name',
    );

  if (search) {
    listQuery = listQuery.where(function () {
      this.where('p.product_name', 'like', `%${search}%`)
        .orWhere('u.full_name', 'like', `%${search}%`);
    });
  }

  if (product_id) {
    listQuery = listQuery.where('r.product_id', parseInt(product_id, 10));
  }

  if (rating) {
    listQuery = listQuery.where('r.rating', parseInt(rating, 10));
  }

  const reviews = await listQuery
    .orderBy('r.created_at', 'desc')
    .offset(offset)
    .limit(limit);

  return {
    reviews: reviews.map((review) => ({
      review_id: review.review_id,
      product_id: review.product_id,
      product_name: review.product_name,
      user_id: review.user_id,
      user_name: review.user_name,
      rating: Number(review.rating),
      comment: review.comment ?? null,
      created_at: review.created_at,
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getAdminReviewById(reviewIdParam) {
  const reviewId = parseReviewId(reviewIdParam);
  const review = await ensureReviewExists(reviewId);

  const [product, user] = await Promise.all([
    db(TABLES.PRODUCTS)
      .select('product_id', 'product_name')
      .where({ product_id: review.product_id })
      .first(),
    db(TABLES.USERS)
      .select('user_id', 'full_name', 'email')
      .where({ user_id: review.user_id })
      .first(),
  ]);

  return {
    review: {
      review_id: review.review_id,
      product_id: review.product_id,
      product_name: product?.product_name ?? null,
      user_id: review.user_id,
      user_name: user?.full_name ?? null,
      user_email: user?.email ?? null,
      rating: Number(review.rating),
      comment: review.comment ?? null,
      created_at: review.created_at,
    },
  };
}

async function deleteAdminReview(reviewIdParam) {
  const reviewId = parseReviewId(reviewIdParam);

  return db.transaction(async (trx) => {
    await ensureReviewExists(reviewId, trx);

    await trx(TABLES.REVIEWS).where({ review_id: reviewId }).del();

    return { review_id: reviewId };
  });
}

async function getReviewStatistics() {
  const stats = await db(TABLES.REVIEWS)
    .select(
      db.raw('COUNT(*) AS total_reviews'),
      db.raw('CAST(ROUND(AVG(CAST(rating AS DECIMAL(10, 2))), 1) AS DECIMAL(10, 1)) AS average_rating'),
    )
    .first();

  const breakdown = await db(TABLES.REVIEWS)
    .select('rating')
    .count({ count: 'review_id' })
    .groupBy('rating');

  const ratingMap = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  breakdown.forEach((row) => {
    ratingMap[row.rating] = Number(row.count);
  });

  return {
    total_reviews: Number(stats?.total_reviews ?? 0),
    average_rating: stats?.average_rating
      ? parseFloat(stats.average_rating)
      : 0,
    five_star_reviews: ratingMap[5],
    four_star_reviews: ratingMap[4],
    three_star_reviews: ratingMap[3],
    two_star_reviews: ratingMap[2],
    one_star_reviews: ratingMap[1],
  };
}

async function getTopRatedProducts() {
  const products = await db(TABLES.REVIEWS)
    .join(
      TABLES.PRODUCTS,
      `${TABLES.REVIEWS}.product_id`,
      `${TABLES.PRODUCTS}.product_id`,
    )
    .select(
      `${TABLES.PRODUCTS}.product_id`,
      `${TABLES.PRODUCTS}.product_name`,
      db.raw('COUNT(*) AS review_count'),
      db.raw('CAST(ROUND(AVG(CAST(rating AS DECIMAL(10, 2))), 1) AS DECIMAL(10, 1)) AS average_rating'),
    )
    .groupBy(
      `${TABLES.PRODUCTS}.product_id`,
      `${TABLES.PRODUCTS}.product_name`,
    )
    .having(db.raw('COUNT(*)'), '>=', 5)
    .orderBy('average_rating', 'desc');

  return {
    products: products.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      review_count: Number(product.review_count),
      average_rating: parseFloat(product.average_rating),
    })),
  };
}

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  getProductReviews,
  getProductReviewSummary,
  getAdminReviews,
  getAdminReviewById,
  deleteAdminReview,
  getReviewStatistics,
  getTopRatedProducts,
};