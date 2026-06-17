const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { generateUniqueSlug } = require('../../utils/slug');

const CATEGORY_COLUMNS = [
  'category_id',
  'category_name',
  'slug',
  'description',
  'image_url',
  'status',
  'parent_id',
  'created_at',
  'updated_at',
];

function parseCategoryId(categoryId) {
  const id = parseInt(categoryId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid category ID', 400);
  }

  return id;
}

function mapCategory(record) {
  if (!record) {
    return null;
  }

  return {
    category_id: record.category_id,
    category_name: record.category_name,
    slug: record.slug,
    description: record.description ?? null,
    image_url: record.image_url ?? null,
    status: Boolean(record.status),
    parent_id: record.parent_id ?? null,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapTreeNode(record) {
  return {
    category_id: record.category_id,
    category_name: record.category_name,
    slug: record.slug,
    description: record.description ?? null,
    image_url: record.image_url ?? null,
    status: Boolean(record.status),
    parent_id: record.parent_id ?? null,
    children: [],
  };
}

function buildCategoryTree(categories) {
  const nodeMap = new Map();

  categories.forEach((category) => {
    nodeMap.set(category.category_id, mapTreeNode(category));
  });

  const roots = [];

  categories.forEach((category) => {
    const node = nodeMap.get(category.category_id);

    if (category.parent_id && nodeMap.has(category.parent_id)) {
      nodeMap.get(category.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function applyListFilters(query, filters) {
  if (filters.category_name) {
    query.where('category_name', 'like', `%${filters.category_name}%`);
  }

  if (filters.status !== undefined && filters.status !== null) {
    query.where('status', filters.status);
  }

  return query;
}

async function ensureCategoryExists(categoryId) {
  const category = await db(TABLES.CATEGORIES)
    .where({ category_id: categoryId })
    .first();

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return category;
}

async function ensureCategoryNameAvailable(categoryName, excludeId = null) {
  const query = db(TABLES.CATEGORIES).where({ category_name: categoryName });

  if (excludeId) {
    query.whereNot({ category_id: excludeId });
  }

  const existing = await query.first();

  if (existing) {
    throw new AppError('Category name already exists', 409);
  }
}

async function ensureParentExists(parentId) {
  if (parentId === null || parentId === undefined) {
    return;
  }

  const parent = await db(TABLES.CATEGORIES)
    .where({ category_id: parentId })
    .first();

  if (!parent) {
    throw new AppError('Parent category not found', 404);
  }
}

async function validateParentAssignment(categoryId, parentId) {
  if (parentId === null || parentId === undefined) {
    return;
  }

  if (parentId === categoryId) {
    throw new AppError('Category cannot be its own parent', 400);
  }

  await ensureParentExists(parentId);

  let currentParentId = parentId;

  while (currentParentId) {
    if (currentParentId === categoryId) {
      throw new AppError('Circular parent relationship is not allowed', 400);
    }

    const ancestor = await db(TABLES.CATEGORIES)
      .where({ category_id: currentParentId })
      .select('parent_id')
      .first();

    currentParentId = ancestor?.parent_id ?? null;
  }
}

async function getCategoryCounts(categoryId) {
  const [childResult, productResult] = await Promise.all([
    db(TABLES.CATEGORIES).where({ parent_id: categoryId }).count({ count: '*' }),
    db(TABLES.PRODUCTS).where({ category_id: categoryId }).count({ count: '*' }),
  ]);

  return {
    child_categories_count: Number(childResult[0]?.count ?? 0),
    product_count: Number(productResult[0]?.count ?? 0),
  };
}

async function getParentCategory(parentId) {
  if (!parentId) {
    return null;
  }

  const parent = await db(TABLES.CATEGORIES)
    .select(CATEGORY_COLUMNS)
    .where({ category_id: parentId })
    .first();

  return mapCategory(parent);
}

async function getCategories(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    category_name: queryParams.category_name?.trim() || null,
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
  };

  let countQuery = db(TABLES.CATEGORIES);
  countQuery = applyListFilters(countQuery, filters);
  const countResult = await countQuery.count({ total: 'category_id' });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(TABLES.CATEGORIES).select(CATEGORY_COLUMNS);
  listQuery = applyListFilters(listQuery, filters);

  const categories = await listQuery
    .orderBy('category_name', 'asc')
    .offset(offset)
    .limit(limit);

  return {
    categories: categories.map(mapCategory),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getCategoryTree(queryParams) {
  const filters = {
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
  };

  let query = db(TABLES.CATEGORIES).select(CATEGORY_COLUMNS);
  query = applyListFilters(query, filters);

  const categories = await query.orderBy('category_name', 'asc');

  return {
    tree: buildCategoryTree(categories),
  };
}

async function getCategoryById(categoryIdParam) {
  const categoryId = parseCategoryId(categoryIdParam);
  const category = await ensureCategoryExists(categoryId);
  const counts = await getCategoryCounts(categoryId);
  const parent = await getParentCategory(category.parent_id);

  return {
    category: mapCategory(category),
    parent,
    child_categories_count: counts.child_categories_count,
    product_count: counts.product_count,
  };
}

async function createCategory(data) {
  const { category_name, parent_id, description, image_url, status } = data;

  await ensureCategoryNameAvailable(category_name);

  const parsedParentId =
    parent_id !== undefined && parent_id !== null
      ? parseInt(parent_id, 10)
      : null;

  if (parsedParentId) {
    await ensureParentExists(parsedParentId);
  }

  const slug = await generateUniqueSlug(
    db,
    TABLES.CATEGORIES,
    'slug',
    category_name
  );

  const insertData = {
    category_name,
    slug,
    parent_id: parsedParentId,
    description: description ?? null,
    image_url: image_url ?? null,
    status: status !== undefined ? parseInt(status, 10) : 1,
  };

  await db(TABLES.CATEGORIES).insert(insertData);

  const category = await db(TABLES.CATEGORIES).where({ slug }).first();

  return getCategoryById(category.category_id);
}

async function updateCategory(categoryIdParam, data) {
  const categoryId = parseCategoryId(categoryIdParam);
  const existing = await ensureCategoryExists(categoryId);

  const updateData = {};

  if (data.category_name !== undefined) {
    await ensureCategoryNameAvailable(data.category_name, categoryId);
    updateData.category_name = data.category_name;
    updateData.slug = await generateUniqueSlug(
      db,
      TABLES.CATEGORIES,
      'slug',
      data.category_name,
      categoryId
    );
  }

  if (data.parent_id !== undefined) {
    const parsedParentId =
      data.parent_id === null || data.parent_id === ''
        ? null
        : parseInt(data.parent_id, 10);

    await validateParentAssignment(categoryId, parsedParentId);
    updateData.parent_id = parsedParentId;
  }

  if (data.description !== undefined) {
    updateData.description = data.description || null;
  }

  if (data.image_url !== undefined) {
    updateData.image_url = data.image_url || null;
  }

  if (data.status !== undefined) {
    updateData.status = parseInt(data.status, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  await db(TABLES.CATEGORIES).where({ category_id: categoryId }).update(updateData);

  return getCategoryById(categoryId);
}

async function deleteCategory(categoryIdParam) {
  const categoryId = parseCategoryId(categoryIdParam);
  await ensureCategoryExists(categoryId);

  await db(TABLES.CATEGORIES).where({ category_id: categoryId }).update({
    status: 0,
  });

  return getCategoryById(categoryId);
}

module.exports = {
  getCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
