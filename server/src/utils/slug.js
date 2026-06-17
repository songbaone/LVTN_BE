function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(knex, tableName, columnName, baseText, excludeId = null) {
  let baseSlug = slugify(baseText);

  if (!baseSlug) {
    baseSlug = `item-${Date.now()}`;
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = knex(tableName).where(columnName, slug);

    if (excludeId !== null && excludeId !== undefined) {
      const idColumn = tableName === 'Categories' ? 'category_id' : 'product_id';
      if (tableName === 'Brands') {
        query.whereNot('brand_id', excludeId);
      } else if (tableName === 'Categories') {
        query.whereNot('category_id', excludeId);
      } else if (tableName === 'Products') {
        query.whereNot('product_id', excludeId);
      } else {
        query.whereNot(idColumn, excludeId);
      }
    }

    const existing = await query.first();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

module.exports = {
  slugify,
  generateUniqueSlug,
};
