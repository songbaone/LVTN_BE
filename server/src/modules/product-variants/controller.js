const variantsService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getAllVariants(req, res, next) {
  try {
    const result = await variantsService.getAllVariants(req.query);
    return sendSuccess(res, 'All variants retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function createVariant(req, res, next) {
  console.log("req.body:", req.body);
  try {
    const variant = await variantsService.createVariant(
      req.params.productId,
      req.body
    );

    return sendSuccess(res, 'Variant created successfully', variant, 201);
  } catch (error) {
    return next(error);
  }
}

async function getProductVariants(req, res, next) {
  try {
    const variants = await variantsService.getProductVariants(
      req.params.productId
    );

    return sendSuccess(res, 'Variants retrieved successfully', variants);
  } catch (error) {
    return next(error);
  }
}

async function getVariantById(req, res, next) {
  try {
    const variant = await variantsService.getVariantById(req.params.variantId);

    return sendSuccess(res, 'Variant retrieved successfully', variant);
  } catch (error) {
    return next(error);
  }
}

async function updateVariant(req, res, next) {
  try {
    const variant = await variantsService.updateVariant(
      req.params.variantId,
      req.body
    );

    return sendSuccess(res, 'Variant updated successfully', variant);
  } catch (error) {
    return next(error);
  }
}

async function deleteVariant(req, res, next) {
  try {
    const result = await variantsService.deleteVariant(req.params.variantId);

    return sendSuccess(res, 'Variant deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function softDeleteVariant(req, res, next) {
  try {
    const result = await variantsService.softDeleteVariant(req.params.variantId);

    return sendSuccess(res, 'Variant soft deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createVariant,
  getProductVariants,
  getVariantById,
  updateVariant,
  deleteVariant,
  softDeleteVariant,
  getAllVariants
};