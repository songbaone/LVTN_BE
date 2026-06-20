const fs = require('fs');
const path = require('path');
const { db } = require('../../database/connection');
const { TABLES, UPLOADS_DIR } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');

const BRAND_COLUMNS = [
  'brand_id',
  'brand_name',
  'logo_url',
  'country',
  'description',
  'status',
  'created_at',
  'updated_at',
];

function parseBrandId(brandId) {
  const id = parseInt(brandId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid brand ID', 400);
  }

  return id;
}

function mapBrand(record) {
  if (!record) {
    return null;
  }

  return {
    brand_id: record.brand_id,
    brand_name: record.brand_name,
    logo_url: record.logo_url ?? null,
    country: record.country ?? null,
    description: record.description ?? null,
    status: Boolean(record.status),
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function applyListFilters(query, filters) {
  if (filters.brand_name) {
    query.where('brand_name', 'like', `%${filters.brand_name}%`);
  }

  if (filters.status !== undefined && filters.status !== null) {
    query.where('status', filters.status);
  }

  return query;
}

async function ensureBrandExists(brandId) {
  const brand = await db(TABLES.BRANDS).where({ brand_id: brandId }).first();

  if (!brand) {
    throw new AppError('Brand not found', 404);
  }

  return brand;
}

async function ensureBrandNameAvailable(brandName, excludeId = null) {
  const query = db(TABLES.BRANDS).where({ brand_name: brandName });

  if (excludeId) {
    query.whereNot({ brand_id: excludeId });
  }

  const existing = await query.first();

  if (existing) {
    throw new AppError('Brand name already exists', 409);
  }
}

async function getProductCount(brandId) {
  const result = await db(TABLES.PRODUCTS)
    .where({ brand_id: brandId })
    .count({ count: '*' });

  return Number(result[0]?.count ?? 0);
}

async function getActiveProductCount(brandId) {
  const result = await db(TABLES.PRODUCTS)
    .where({ brand_id: brandId, status: 1 })
    .count({ count: '*' });

  return Number(result[0]?.count ?? 0);
}

function removeLocalLogoFile(logoUrl) {
  if (!logoUrl || !logoUrl.startsWith('/uploads/')) {
    return;
  }

  const relativePath = logoUrl.replace('/uploads/', '');
  const absolutePath = path.join(UPLOADS_DIR, relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

async function getBrands(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);

  const filters = {
    brand_name: queryParams.brand_name?.trim() || null,
    status:
      queryParams.status !== undefined
        ? parseInt(queryParams.status, 10)
        : undefined,
  };

  let countQuery = db(TABLES.BRANDS);
  countQuery = applyListFilters(countQuery, filters);
  const countResult = await countQuery.count({ total: 'brand_id' });
  const total = Number(countResult[0]?.total ?? 0);

  let listQuery = db(TABLES.BRANDS).select(BRAND_COLUMNS);
  listQuery = applyListFilters(listQuery, filters);

  const brands = await listQuery
    .orderBy('brand_name', 'asc')
    .offset(offset)
    .limit(limit);

  return {
    brands: brands.map(mapBrand),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getBrandById(brandIdParam) {
  const brandId = parseBrandId(brandIdParam);
  const brand = await ensureBrandExists(brandId);
  const product_count = await getProductCount(brandId);

  return {
    brand: mapBrand(brand),
    product_count,
  };
}

async function createBrand(data, file = null) {
  const { brand_name, country, description, status } = data;

  await ensureBrandNameAvailable(brand_name);

  const logo_url = file ? `/uploads/brands/${file.filename}` : null;

  const insertData = {
    brand_name,
    country: country ?? null,
    description: description ?? null,
    logo_url,
    status: status !== undefined ? parseInt(status, 10) : 1,
  };

  try {
    await db(TABLES.BRANDS).insert(insertData);

    const brand = await db(TABLES.BRANDS).where({ brand_name }).first();

    return getBrandById(brand.brand_id);
  } catch (error) {
    if (file) {
      removeLocalLogoFile(logo_url);
    }
    throw error;
  }
}

async function updateBrand(brandIdParam, data, file = null) {
  const brandId = parseBrandId(brandIdParam);
  await ensureBrandExists(brandId);

  const updateData = {};

  if (data.brand_name !== undefined) {
    await ensureBrandNameAvailable(data.brand_name, brandId);
    updateData.brand_name = data.brand_name;
  }

  if (data.country !== undefined) {
    updateData.country = data.country || null;
  }

  if (data.description !== undefined) {
    updateData.description = data.description || null;
  }

  if (file) {
    updateData.logo_url = `/uploads/brands/${file.filename}`;
  }

  if (data.status !== undefined) {
    updateData.status = parseInt(data.status, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  try {
    await db(TABLES.BRANDS).where({ brand_id: brandId }).update(updateData);

    return getBrandById(brandId);
  } catch (error) {
    if (file) {
      removeLocalLogoFile(updateData.logo_url);
    }
    throw error;
  }
}

async function deleteBrand(brandIdParam) {
  const brandId = parseBrandId(brandIdParam);
  await ensureBrandExists(brandId);

  const activeProductCount = await getActiveProductCount(brandId);

  if (activeProductCount > 0) {
    throw new AppError(
      'Cannot delete brand that has active products. Remove or reassign products first',
      400
    );
  }

  await db(TABLES.BRANDS).where({ brand_id: brandId }).update({ status: 0 });

  return getBrandById(brandId);
}

async function uploadBrandLogo(brandIdParam, file) {
  const brandId = parseBrandId(brandIdParam);

  if (!file) {
    throw new AppError('Logo file is required', 400);
  }

  const brand = await ensureBrandExists(brandId);
  const logo_url = `/uploads/brands/${file.filename}`;

  await db(TABLES.BRANDS).where({ brand_id: brandId }).update({ logo_url });

  if (brand.logo_url && brand.logo_url !== logo_url) {
    removeLocalLogoFile(brand.logo_url);
  }

  return {
    logo_url,
    brand: (await getBrandById(brandId)).brand,
  };
}

async function uploadBrandLogoStandalone(file) {
  if (!file) {
    throw new AppError('Logo file is required', 400);
  }

  const logo_url = `/uploads/brands/${file.filename}`;

  return {
    logo_url,
  };
}

module.exports = {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
  uploadBrandLogoStandalone,
};
