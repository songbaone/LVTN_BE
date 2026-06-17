const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
});

const ORDER_STATUS = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
});

const INVENTORY_TRANSACTION_TYPE = Object.freeze({
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
  RETURN: 'RETURN',
  CANCEL: 'CANCEL',
});

const COUPON_DISCOUNT_TYPE = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
};

const TABLES = Object.freeze({
  ROLES: 'Roles',
  USERS: 'Users',
  CATEGORIES: 'Categories',
  BRANDS: 'Brands',
  PRODUCTS: 'Products',
  PRODUCT_IMAGES: 'ProductImages',
  PRODUCT_VARIANTS: 'ProductVariants',
  ADDRESSES: 'Addresses',
  CART: 'Cart',
  CART_ITEMS: 'CartItems',
  COUPONS: 'Coupons',
  ORDERS: 'Orders',
  ORDER_DETAILS: 'OrderDetails',
  PAYMENTS: 'Payments',
  REVIEWS: 'Reviews',
  INVENTORY_TRANSACTIONS: 'InventoryTransactions',
});

const UPLOAD_FOLDERS = Object.freeze({
  AVATARS: path.join(UPLOADS_DIR, 'avatars'),
  PRODUCTS: path.join(UPLOADS_DIR, 'products'),
  BRANDS: path.join(UPLOADS_DIR, 'brands'),
  CATEGORIES: path.join(UPLOADS_DIR, 'categories'),
  TEMP: path.join(UPLOADS_DIR, 'temp'),
});

const API_PREFIX = '/api/v1';

module.exports = {
  ROOT_DIR,
  UPLOADS_DIR,
  ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  INVENTORY_TRANSACTION_TYPE,
  COUPON_DISCOUNT_TYPE,
  TABLES,
  UPLOAD_FOLDERS,
  API_PREFIX,
};
