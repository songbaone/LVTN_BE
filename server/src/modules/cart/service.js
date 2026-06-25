const { db } = require('../../database/connection');
const { TABLES } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');
const { calculateSellingPrice } = require('../../utils/pricing');

function parseItemId(itemId) {
  const id = parseInt(itemId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid cart item ID', 400);
  }

  return id;
}

function parseVariantId(variantId) {
  const id = parseInt(variantId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid variant ID', 400);
  }

  return id;
}

function parseQuantity(quantity) {
  const qty = parseInt(quantity, 10);

  if (Number.isNaN(qty) || qty < 1) {
    throw new AppError('Invalid quantity', 400);
  }

  return qty;
}

function mapCartItem(record) {
  if (!record) {
    return null;
  }

  const basePrice = record.discount_price &&
    Number(record.discount_price) > 0
      ? Number(record.discount_price)
      : Number(record.price);
  const additionalPrice = Number(record.additional_price || 0);
  const unitPrice = basePrice + additionalPrice;
  const subtotal = unitPrice * record.quantity;

  return {
    cart_item_id: record.cart_item_id,

    product: {
      product_id: record.product_id,
      product_name: record.product_name,
      slug: record.slug,
      thumbnail: record.thumbnail,
      image_url: record.image_url,
    },

    variant: {
      variant_id: record.variant_id,
      sku: record.sku,
      color: record.color,
      size: record.size,
      material: record.material,
      stock_quantity: record.stock_quantity,
    },

    quantity: record.quantity,

    pricing: {
      price: Number(record.price),
      discount_price: record.discount_price
        ? Number(record.discount_price)
        : null,
      additional_price: additionalPrice,
      selling_price: unitPrice,
    },
  };
}

async function getOrCreateCart(userId, trx = db) {
  let cart = await trx(TABLES.CART).where({ user_id: userId }).first();

  if (!cart) {
    const [cartId] = await trx(TABLES.CART).insert({ user_id: userId });
    cart = await trx(TABLES.CART).where({ cart_id: cartId }).first();
  }

  return cart;
}

async function ensureCartItemBelongsToUser(userId, itemId, trx = db) {
  const cart = await trx(TABLES.CART).where({ user_id: userId }).first();

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const cartItem = await trx(TABLES.CART_ITEMS)
    .where({ cart_item_id: itemId, cart_id: cart.cart_id })
    .first();

  if (!cartItem) {
    throw new AppError('Cart item not found', 404);
  }

  return cartItem;
}

async function validateVariantAndStock(variantId, quantity, trx = db) {
  const query = trx(TABLES.PRODUCT_VARIANTS)
  .join(
    TABLES.PRODUCTS,
    `${TABLES.PRODUCT_VARIANTS}.product_id`,
    `${TABLES.PRODUCTS}.product_id`
  )
  .select(
    `${TABLES.PRODUCT_VARIANTS}.variant_id`,
    `${TABLES.PRODUCT_VARIANTS}.product_id`,
    `${TABLES.PRODUCT_VARIANTS}.stock_quantity`,
    `${TABLES.PRODUCTS}.product_name`,
    `${TABLES.PRODUCTS}.price`,
    `${TABLES.PRODUCTS}.status as product_status`
  )
  .where(`${TABLES.PRODUCT_VARIANTS}.variant_id`, variantId);

console.log(query.toSQL());

const variant = await query.first();

  console.log('VARIANT:', variant);
console.log('PRODUCT STATUS:', variant.product_status);
console.log('TYPE:', typeof variant.product_status);

  if (!variant) {
    throw new AppError('Variant not found', 404);
  }

  if (!variant.product_status) {
  throw new AppError('Product is inactive', 400);
}

  if (variant.stock_quantity < quantity) {
    throw new AppError('Insufficient stock quantity', 400);
  }

  return variant;
}

async function getCart(userId) {
  const cart = await getOrCreateCart(userId);

  const items = await db(TABLES.CART_ITEMS)
  .join(
    TABLES.PRODUCT_VARIANTS,
    `${TABLES.CART_ITEMS}.variant_id`,
    `${TABLES.PRODUCT_VARIANTS}.variant_id`
  )
  .join(
    TABLES.PRODUCTS,
    `${TABLES.PRODUCT_VARIANTS}.product_id`,
    `${TABLES.PRODUCTS}.product_id`
  )
  .leftJoin(
    TABLES.PRODUCT_IMAGES,
    function () {
      this.on(
        `${TABLES.PRODUCT_IMAGES}.product_id`,
        '=',
        `${TABLES.PRODUCTS}.product_id`
      ).andOnVal(
        `${TABLES.PRODUCT_IMAGES}.is_main`,
        '=',
        1
      );
    }
  )
  .select(
    // Cart Item
    `${TABLES.CART_ITEMS}.cart_item_id`,
    `${TABLES.CART_ITEMS}.quantity`,

    // Product
    `${TABLES.PRODUCTS}.product_id`,
    `${TABLES.PRODUCTS}.product_name`,
    `${TABLES.PRODUCTS}.slug`,
    `${TABLES.PRODUCTS}.thumbnail`,
    `${TABLES.PRODUCTS}.price`,
    `${TABLES.PRODUCTS}.discount_price`,

    // Main Image
    `${TABLES.PRODUCT_IMAGES}.image_url`,

    // Variant
    `${TABLES.PRODUCT_VARIANTS}.variant_id`,
    `${TABLES.PRODUCT_VARIANTS}.sku`,
    `${TABLES.PRODUCT_VARIANTS}.color`,
    `${TABLES.PRODUCT_VARIANTS}.size`,
    `${TABLES.PRODUCT_VARIANTS}.material`,
    `${TABLES.PRODUCT_VARIANTS}.stock_quantity`,
    `${TABLES.PRODUCT_VARIANTS}.additional_price`
  )
  .where(
    `${TABLES.CART_ITEMS}.cart_id`,
    cart.cart_id
  );

  const mappedItems = items.map(mapCartItem);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalUniqueItems = items.length;
  const subtotalAmount = mappedItems.reduce(
    (sum, item) => sum + item.pricing.selling_price * item.quantity,
    0,
  );

  return {
    cart_id: cart.cart_id,
    total_unique_items: totalUniqueItems,
    total_items: totalItems,
    subtotal_amount: subtotalAmount,
    items: mappedItems,
  };
}

async function addItem(userId, variantIdParam, quantityParam) {
  const variantId = parseVariantId(variantIdParam);
  const quantity = parseQuantity(quantityParam);

  await db.transaction(async (trx) => {
    const variant = await validateVariantAndStock(variantId, quantity, trx);
    const cart = await getOrCreateCart(userId, trx);

    const existingItem = await trx(TABLES.CART_ITEMS)
      .where({ cart_id: cart.cart_id, variant_id: variantId })
      .first();

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > variant.stock_quantity) {
        throw new AppError('Quantity exceeds available stock', 400);
      }

      await trx(TABLES.CART_ITEMS)
        .where({ cart_item_id: existingItem.cart_item_id })
        .update({ quantity: newQuantity });
    } else {
      await trx(TABLES.CART_ITEMS).insert({
        cart_id: cart.cart_id,
        variant_id: variantId,
        quantity: quantity,
      });
    }
  });

  return await getCart(userId);
}

async function updateItem(userId, itemIdParam, quantityParam) {
  const itemId = parseItemId(itemIdParam);
  const quantity = parseQuantity(quantityParam);

  await db.transaction(async (trx) => {
    const cartItem = await ensureCartItemBelongsToUser(userId, itemId, trx);
    const variant = await validateVariantAndStock(cartItem.variant_id, quantity, trx);

    if (quantity > variant.stock_quantity) {
      throw new AppError('Quantity exceeds available stock', 400);
    }

    await trx(TABLES.CART_ITEMS)
      .where({ cart_item_id: itemId })
      .update({ quantity: quantity });
  });

  return await getCart(userId);
}

async function deleteItem(userId, itemIdParam) {
  const itemId = parseItemId(itemIdParam);

  await db.transaction(async (trx) => {
    await ensureCartItemBelongsToUser(userId, itemId, trx);

    await trx(TABLES.CART_ITEMS)
      .where({ cart_item_id: itemId })
      .del();
  });

  return await getCart(userId);
}

async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);

  await db(TABLES.CART_ITEMS)
    .where({ cart_id: cart.cart_id })
    .del();

  return await getCart(userId);
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  deleteItem,
  clearCart,
};
