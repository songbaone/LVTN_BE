const productImagesService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getProductImages(req, res, next) {
  try {
    const result = await productImagesService.getProductImages(req.params.productId);

    return sendSuccess(res, 'Product images retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function uploadProductImage(req, res, next) {
  try {
    const image = await productImagesService.uploadProductImage(
      req.params.productId,
      req.file
    );

    return sendSuccess(res, 'Product image uploaded successfully', image, 201);
  } catch (error) {
    return next(error);
  }
}

async function deleteProductImage(req, res, next) {
  try {
    const result = await productImagesService.deleteProductImage(
      req.params.productId,
      req.params.imageId
    );

    return sendSuccess(res, 'Product image deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function setMainImage(req, res, next) {
  try {
    const image = await productImagesService.setMainImage(
      req.params.productId,
      req.params.imageId
    );

    return sendSuccess(res, 'Main image updated successfully', image);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  setMainImage,
};
