const ExcelJS = require('exceljs');
const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { generateReferenceCode } = require('../stockLogs/refCode');
const { createStockLog } = require('../stockLogs/service');

async function listStocks(queryParams) {
  const { page, limit, offset } = getPagination(queryParams);
  const { search, category_id, brand_id } = queryParams;

  let countQuery = db(TABLES.PRODUCT_VARIANTS)
    .join(TABLES.PRODUCTS, 'ProductVariants.product_id', 'Products.product_id')
    .leftJoin(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .leftJoin(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id');

  let listQuery = db(TABLES.PRODUCT_VARIANTS)
    .join(TABLES.PRODUCTS, 'ProductVariants.product_id', 'Products.product_id')
    .leftJoin(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .leftJoin(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id')
    .leftJoin(TABLES.PRODUCT_IMAGES, function () {
      this.on('Products.product_id', 'ProductImages.product_id');
      this.andOn('ProductImages.is_main', db.raw('1'));
    })
    .select(
      'Products.product_id',
      'Products.product_name',
      'Brands.brand_name',
      'Categories.category_name',
      'Products.price',
      'Products.discount_price',
      'Products.updated_at',
      'ProductVariants.variant_id',
      'ProductVariants.sku',
      'ProductVariants.size',
      'ProductVariants.color',
      'ProductVariants.material',
      'ProductVariants.additional_price',
      'ProductVariants.stock_quantity',
      'Products.status',
      'ProductImages.image_url as main_image_url'
    );

  if (search) {
    const searchPattern = `%${search}%`;
    const searchFilter = function (qb) {
      qb.where('Products.product_name', 'like', searchPattern)
        .orWhere('ProductVariants.sku', 'like', searchPattern);
    };
    countQuery.where(searchFilter);
    listQuery.where(searchFilter);
  }

  if (category_id) {
    const catId = parseInt(category_id, 10);
    countQuery.where('Products.category_id', catId);
    listQuery.where('Products.category_id', catId);
  }

  if (brand_id) {
    const brId = parseInt(brand_id, 10);
    countQuery.where('Products.brand_id', brId);
    listQuery.where('Products.brand_id', brId);
  }

  const countResult = await countQuery.count({ total: 'ProductVariants.variant_id' });
  const total = Number(countResult[0]?.total ?? 0);

  const variants = await listQuery
    .orderBy('Products.product_id', 'asc')
    .orderBy('ProductVariants.variant_id', 'asc')
    .offset(offset)
    .limit(limit);

  const rows = variants.map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    brand_name: row.brand_name ?? null,
    category_name: row.category_name ?? null,
    main_image_url: row.main_image_url ?? null,
    price: Number(row.price ?? 0),
    discount_price: row.discount_price != null ? Number(row.discount_price) : null,
    variant_id: row.variant_id,
    sku: row.sku,
    size: row.size ?? null,
    color: row.color ?? null,
    material: row.material ?? null,
    additional_price: Number(row.additional_price ?? 0),
    stock_quantity: Number(row.stock_quantity ?? 0),
    status: Boolean(row.status),
    updated_at: row.updated_at ?? null,
  }));

  return {
    stocks: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getProductStock(productId) {
  const product = await db(TABLES.PRODUCTS)
    .leftJoin(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .leftJoin(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id')
    .select(
      'Products.product_id',
      'Products.product_name',
      'Products.slug',
      'Products.sku',
      'Products.category_id',
      'Products.brand_id',
      'Categories.category_name',
      'Brands.brand_name',
      'Products.status'
    )
    .where('Products.product_id', productId)
    .first();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const variants = await db(TABLES.PRODUCT_VARIANTS)
    .where({ product_id: productId })
    .orderBy('variant_id', 'asc')
    .select(
      'variant_id',
      'sku',
      'size',
      'color',
      'material',
      'additional_price',
      'stock_quantity'
    );

  return {
    product: {
      product_id: product.product_id,
      product_name: product.product_name,
      slug: product.slug,
      sku: product.sku,
      category_id: product.category_id,
      category_name: product.category_name ?? null,
      brand_id: product.brand_id,
      brand_name: product.brand_name ?? null,
      status: Boolean(product.status),
    },
    variants: variants.map((v) => ({
      variant_id: v.variant_id,
      sku: v.sku,
      size: v.size ?? null,
      color: v.color ?? null,
      material: v.material ?? null,
      additional_price: Number(v.additional_price ?? 0),
      stock_quantity: Number(v.stock_quantity ?? 0),
    })),
  };
}

async function importStock(data, user) {
  const { product_id, variants } = data;

  const product = await db(TABLES.PRODUCTS).where({ product_id }).first();
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const updatedVariants = [];
  const referenceCode = await generateReferenceCode('MANUAL_IMPORT');
  const userId = user.user_id;

  await db.transaction(async (trx) => {
    for (const item of variants) {
      const variant = await trx(TABLES.PRODUCT_VARIANTS)
        .where({ variant_id: item.variant_id, product_id })
        .first();

      if (!variant) {
        throw new AppError(`Variant ${item.variant_id} not found for this product`, 404);
      }

      const oldQuantity = Number(variant.stock_quantity);
      const newQuantity = oldQuantity + item.quantity;

      await trx(TABLES.PRODUCT_VARIANTS)
        .where({ variant_id: item.variant_id })
        .update({ stock_quantity: newQuantity });

      await createStockLog(trx, {
        product_id: Number(product_id),
        variant_id: item.variant_id,
        old_quantity: oldQuantity,
        change_quantity: item.quantity,
        new_quantity: newQuantity,
        action_type: 'MANUAL_IMPORT',
        reference_code: referenceCode,
        note: null,
        created_by: userId,
      });

      updatedVariants.push({
        variant_id: item.variant_id,
        sku: variant.sku,
        previous_quantity: oldQuantity,
        added_quantity: item.quantity,
        stock_quantity: newQuantity,
      });
    }
  });

  return { updated_variants: updatedVariants, reference_code: referenceCode };
}

async function adjustStock(data, user) {
  const { variant_id, stock_quantity } = data;

  const variant = await db(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id })
    .first();

  if (!variant) {
    throw new AppError('Variant not found', 404);
  }

  const referenceCode = await generateReferenceCode('ADJUST');
  const userId = user.user_id;
  const oldQuantity = Number(variant.stock_quantity);
  const changeQuantity = stock_quantity - oldQuantity;

  await db.transaction(async (trx) => {
    await trx(TABLES.PRODUCT_VARIANTS)
      .where({ variant_id })
      .update({ stock_quantity });

    await createStockLog(trx, {
      product_id: variant.product_id,
      variant_id: Number(variant_id),
      old_quantity: oldQuantity,
      change_quantity: changeQuantity,
      new_quantity: stock_quantity,
      action_type: 'ADJUST',
      reference_code: referenceCode,
      note: null,
      created_by: userId,
    });
  });

  const updated = await db(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id })
    .first();

  return {
    variant_id: updated.variant_id,
    sku: updated.sku,
    stock_quantity: Number(updated.stock_quantity),
    reference_code: referenceCode,
  };
}

async function updateVariantStock(variantId, data, user) {
  const variant = await db(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantId })
    .first();

  if (!variant) {
    throw new AppError('Variant not found', 404);
  }

  const referenceCode = await generateReferenceCode('ADJUST');
  const userId = user.user_id;
  const oldQuantity = Number(variant.stock_quantity);
  const newQuantity = data.stock_quantity;
  const changeQuantity = newQuantity - oldQuantity;

  await db.transaction(async (trx) => {
    await trx(TABLES.PRODUCT_VARIANTS)
      .where({ variant_id: variantId })
      .update({ stock_quantity: newQuantity });

    await createStockLog(trx, {
      product_id: variant.product_id,
      variant_id: Number(variantId),
      old_quantity: oldQuantity,
      change_quantity: changeQuantity,
      new_quantity: newQuantity,
      action_type: 'ADJUST',
      reference_code: referenceCode,
      note: null,
      created_by: userId,
    });
  });

  const updated = await db(TABLES.PRODUCT_VARIANTS)
    .where({ variant_id: variantId })
    .first();

  return {
    variant_id: updated.variant_id,
    sku: updated.sku,
    size: updated.size ?? null,
    color: updated.color ?? null,
    material: updated.material ?? null,
    stock_quantity: Number(updated.stock_quantity),
    reference_code: referenceCode,
  };
}

async function getLowStock(threshold = 10) {
  const variants = await db(TABLES.PRODUCT_VARIANTS)
    .join(TABLES.PRODUCTS, 'ProductVariants.product_id', 'Products.product_id')
    .leftJoin(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .leftJoin(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id')
    .select(
      'Products.product_id',
      'Products.product_name',
      'Brands.brand_name',
      'Categories.category_name',
      'ProductVariants.variant_id',
      'ProductVariants.sku',
      'ProductVariants.size',
      'ProductVariants.color',
      'ProductVariants.material',
      'ProductVariants.stock_quantity'
    )
    .where('ProductVariants.stock_quantity', '<=', threshold)
    .where('ProductVariants.stock_quantity', '>', 0)
    .orderBy('ProductVariants.stock_quantity', 'asc');

  return variants.map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    brand_name: row.brand_name ?? null,
    category_name: row.category_name ?? null,
    variant_id: row.variant_id,
    sku: row.sku,
    size: row.size ?? null,
    color: row.color ?? null,
    material: row.material ?? null,
    stock_quantity: Number(row.stock_quantity ?? 0),
  }));
}

async function getOutOfStock() {
  const variants = await db(TABLES.PRODUCT_VARIANTS)
    .join(TABLES.PRODUCTS, 'ProductVariants.product_id', 'Products.product_id')
    .leftJoin(TABLES.CATEGORIES, 'Products.category_id', 'Categories.category_id')
    .leftJoin(TABLES.BRANDS, 'Products.brand_id', 'Brands.brand_id')
    .select(
      'Products.product_id',
      'Products.product_name',
      'Brands.brand_name',
      'Categories.category_name',
      'ProductVariants.variant_id',
      'ProductVariants.sku',
      'ProductVariants.size',
      'ProductVariants.color',
      'ProductVariants.material',
      'ProductVariants.stock_quantity'
    )
    .where('ProductVariants.stock_quantity', 0)
    .orderBy('Products.product_name', 'asc');

  return variants.map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    brand_name: row.brand_name ?? null,
    category_name: row.category_name ?? null,
    variant_id: row.variant_id,
    sku: row.sku,
    size: row.size ?? null,
    color: row.color ?? null,
    material: row.material ?? null,
    stock_quantity: Number(row.stock_quantity ?? 0),
  }));
}

async function getDashboard() {
  const totalProductsResult = await db(TABLES.PRODUCTS).count({ total: 'product_id' }).where({ status: 1 });
  const totalProducts = Number(totalProductsResult[0]?.total ?? 0);

  const totalVariantsResult = await db(TABLES.PRODUCT_VARIANTS).count({ total: 'variant_id' });
  const totalVariants = Number(totalVariantsResult[0]?.total ?? 0);

  const totalStockResult = await db(TABLES.PRODUCT_VARIANTS).sum({ total: 'stock_quantity' });
  const totalStock = Number(totalStockResult[0]?.total ?? 0);

  const lowStockResult = await db(TABLES.PRODUCT_VARIANTS)
    .count({ total: 'variant_id' })
    .where('stock_quantity', '<=', 10)
    .where('stock_quantity', '>', 0);
  const lowStockCount = Number(lowStockResult[0]?.total ?? 0);

  const outOfStockResult = await db(TABLES.PRODUCT_VARIANTS)
    .count({ total: 'variant_id' })
    .where('stock_quantity', 0);
  const outOfStockCount = Number(outOfStockResult[0]?.total ?? 0);

  return {
    total_products: totalProducts,
    total_variants: totalVariants,
    total_stock: totalStock,
    low_stock_count: lowStockCount,
    out_of_stock_count: outOfStockCount,
  };
}

async function exportTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock Import Template');

  sheet.columns = [
    { header: 'Product ID', key: 'product_id', width: 15 },
    { header: 'Product Name', key: 'product_name', width: 40 },
    { header: 'Variant ID', key: 'variant_id', width: 15 },
    { header: 'SKU', key: 'sku', width: 20 },
    { header: 'Size', key: 'size', width: 15 },
    { header: 'Color', key: 'color', width: 15 },
    { header: 'Material', key: 'material', width: 20 },
    { header: 'Current Stock', key: 'stock_quantity', width: 18 },
    { header: 'Import Quantity', key: 'import_quantity', width: 18 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const variants = await db(TABLES.PRODUCT_VARIANTS)
    .join(TABLES.PRODUCTS, 'ProductVariants.product_id', 'Products.product_id')
    .select(
      'Products.product_id',
      'Products.product_name',
      'ProductVariants.variant_id',
      'ProductVariants.sku',
      'ProductVariants.size',
      'ProductVariants.color',
      'ProductVariants.material',
      'ProductVariants.stock_quantity'
    )
    .orderBy('Products.product_id', 'asc')
    .orderBy('ProductVariants.variant_id', 'asc');

  variants.forEach((row) => {
    sheet.addRow({
      product_id: row.product_id,
      product_name: row.product_name,
      variant_id: row.variant_id,
      sku: row.sku,
      size: row.size ?? '',
      color: row.color ?? '',
      material: row.material ?? '',
      stock_quantity: Number(row.stock_quantity ?? 0),
      import_quantity: '',
    });
  });

  return workbook;
}

async function previewImport(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer);

  const sheet = workbook.worksheets[0];
  const validRows = [];
  const invalidRows = [];

  const rows = [];

  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return; // skip header
    rows.push({ row, rowIndex });
  });

  for (const { row, rowIndex } of rows) {
    const variantId = row.getCell(3).value; // Variant ID column
    const importQuantity = row.getCell(9).value; // Import Quantity column

    if (!variantId || !Number.isInteger(variantId) || variantId < 1) {
      invalidRows.push({
        row: rowIndex,
        sku: null,
        product_name: null,
        import_quantity: null,
        status: 'invalid',
        message: 'ID biến thể không hợp lệ',
      });
      continue;
    }

    if (!importQuantity || !Number.isInteger(importQuantity) || importQuantity < 1) {
      invalidRows.push({
        row: rowIndex,
        variant_id: variantId,
        sku: null,
        product_name: null,
        import_quantity: null,
        status: 'invalid',
        message: 'Số lượng nhập phải là số nguyên dương',
      });
      continue;
    }

    // Look up variant with product info
    const variant = await db(TABLES.PRODUCT_VARIANTS)
      .join(TABLES.PRODUCTS, 'ProductVariants.product_id', 'Products.product_id')
      .select(
        'ProductVariants.variant_id',
        'ProductVariants.sku',
        'Products.product_name'
      )
      .where('ProductVariants.variant_id', variantId)
      .first();

    if (!variant) {
      invalidRows.push({
        row: rowIndex,
        variant_id: variantId,
        sku: null,
        product_name: null,
        import_quantity: importQuantity,
        status: 'invalid',
        message: 'Biến thể không tồn tại',
      });
      continue;
    }

    validRows.push({
      row: rowIndex,
      variant_id: variant.variant_id,
      sku: variant.sku,
      product_name: variant.product_name,
      import_quantity: importQuantity,
      status: 'valid',
      message: 'Dữ liệu hợp lệ',
    });
  }

  const totalRows = validRows.length + invalidRows.length;

  return {
    summary: {
      total_rows: totalRows,
      valid_count: validRows.length,
      invalid_count: invalidRows.length,
    },
    valid_rows: validRows,
    invalid_rows: invalidRows,
  };
}

async function importExcel(file, user) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer);

  const sheet = workbook.worksheets[0];
  const errors = [];
  const successRows = [];
  const rows = [];

  // Build rows array using callback (eachRow does NOT return an iterable)
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      rows.push(row);
    }
  });

  const totalRows = rows.length;

  const referenceCode = await generateReferenceCode('EXCEL_IMPORT');
  const userId = user.user_id;
  let successCount = 0;

  await db.transaction(async (trx) => {
    for (const row of rows) {
      const variantId = parseInt(row.getCell(3).value, 10);
      const importQuantity = parseInt(row.getCell(9).value, 10);

      if (Number.isNaN(variantId) || variantId < 1) {
        errors.push({ row: row.number, variant_id: variantId, reason: 'Invalid variant_id' });
        continue;
      }

      if (Number.isNaN(importQuantity) || importQuantity < 1) {
        errors.push({
          row: row.number,
          variant_id: variantId,
          reason: 'Import quantity must be a positive integer',
        });
        continue;
      }

      const variant = await trx(TABLES.PRODUCT_VARIANTS)
        .where({ variant_id: variantId })
        .first();

      if (!variant) {
        errors.push({ row: row.number, variant_id: variantId, reason: 'Variant not found' });
        continue;
      }

      const oldQuantity = Number(variant.stock_quantity);
      const newQuantity = oldQuantity + importQuantity;

      await trx(TABLES.PRODUCT_VARIANTS)
        .where({ variant_id: variantId })
        .update({ stock_quantity: newQuantity });

      await createStockLog(trx, {
        product_id: variant.product_id,
        variant_id: variantId,
        old_quantity: oldQuantity,
        change_quantity: importQuantity,
        new_quantity: newQuantity,
        action_type: 'EXCEL_IMPORT',
        reference_code: referenceCode,
        note: null,
        created_by: userId,
      });

      successCount++;
      successRows.push({
        variant_id: variantId,
        sku: variant.sku,
        previous_quantity: oldQuantity,
        added_quantity: importQuantity,
        stock_quantity: newQuantity,
      });
    }
  });

  return {
    total_rows: totalRows,
    success_rows: successCount,
    failed_rows: errors.length,
    errors,
    reference_code: referenceCode,
  };
}

async function exportReport() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock Report');

  sheet.columns = [
    { header: 'Product Name', key: 'product_name', width: 40 },
    { header: 'SKU', key: 'sku', width: 20 },
    { header: 'Size', key: 'size', width: 15 },
    { header: 'Color', key: 'color', width: 15 },
    { header: 'Material', key: 'material', width: 20 },
    { header: 'Current Stock', key: 'stock_quantity', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const variants = await db(TABLES.PRODUCT_VARIANTS)
    .join(TABLES.PRODUCTS, 'ProductVariants.product_id', 'Products.product_id')
    .select(
      'Products.product_name',
      'ProductVariants.sku',
      'ProductVariants.size',
      'ProductVariants.color',
      'ProductVariants.material',
      'ProductVariants.stock_quantity'
    )
    .orderBy('Products.product_name', 'asc')
    .orderBy('ProductVariants.variant_id', 'asc');

  variants.forEach((row) => {
    sheet.addRow({
      product_name: row.product_name,
      sku: row.sku,
      size: row.size ?? '',
      color: row.color ?? '',
      material: row.material ?? '',
      stock_quantity: Number(row.stock_quantity ?? 0),
    });
  });

  return workbook;
}

module.exports = {
  listStocks,
  getProductStock,
  importStock,
  adjustStock,
  updateVariantStock,
  getLowStock,
  getOutOfStock,
  getDashboard,
  exportTemplate,
  previewImport,
  importExcel,
  exportReport,
};