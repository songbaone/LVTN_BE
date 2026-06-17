function getPagination(query = {}, options = {}) {
  const defaultPage = options.page ?? 1;
  const defaultLimit = options.limit ?? 10;
  const maxLimit = options.maxLimit ?? 100;

  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (Number.isNaN(page) || page < 1) {
    page = defaultPage;
  }

  if (Number.isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }

  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function buildPaginationMeta(total, page, limit) {
  const totalRecords = Number(total) || 0;
  const totalPages = limit > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    page,
    limit,
    total: totalRecords,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = {
  getPagination,
  buildPaginationMeta,
};
