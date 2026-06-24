/**
 * Calculate the selling price for a product/variant combination.
 *
 * Base price = discount_price if discount_price is not null and > 0, otherwise price.
 * Selling price = base_price + additional_price.
 *
 * @param {number} productPrice - The product's base price.
 * @param {number|null|undefined} discountPrice - The product's discount price.
 * @param {number|null|undefined} additionalPrice - The variant's additional price.
 * @returns {number} The computed selling price.
 */
function calculateSellingPrice(productPrice, discountPrice, additionalPrice) {
  const basePrice =
    discountPrice !== null &&
    discountPrice !== undefined &&
    Number(discountPrice) > 0
      ? Number(discountPrice)
      : Number(productPrice);

  return basePrice + Number(additionalPrice || 0);
}

module.exports = {
  calculateSellingPrice,
};