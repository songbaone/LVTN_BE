const productsService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getProducts(req, res, next) {
  try {
    const result = await productsService.getProducts(req.query);

    return sendSuccess(res, 'Products retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const product = await productsService.getProductById(req.params.id);

    return sendSuccess(res, 'Product retrieved successfully', product);
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await productsService.createProduct(req.body, req.files);

    return sendSuccess(res, 'Product created successfully', product, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await productsService.updateProduct(
      req.params.id,
      req.body,
      req.files
    );

    return sendSuccess(res, 'Product updated successfully', product);
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const result = await productsService.deleteProduct(req.params.id);

    return sendSuccess(res, 'Product deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
