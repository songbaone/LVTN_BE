const brandsService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getBrands(req, res, next) {
  try {
    const result = await brandsService.getBrands(req.query);

    return sendSuccess(res, 'Brands retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getBrandById(req, res, next) {
  try {
    const brand = await brandsService.getBrandById(req.params.id);

    return sendSuccess(res, 'Brand retrieved successfully', brand);
  } catch (error) {
    return next(error);
  }
}

async function createBrand(req, res, next) {
  try {
    const brand = await brandsService.createBrand(req.body);

    return sendSuccess(res, 'Brand created successfully', brand, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateBrand(req, res, next) {
  try {
    const brand = await brandsService.updateBrand(req.params.id, req.body);

    return sendSuccess(res, 'Brand updated successfully', brand);
  } catch (error) {
    return next(error);
  }
}

async function deleteBrand(req, res, next) {
  try {
    const result = await brandsService.deleteBrand(req.params.id);

    return sendSuccess(res, 'Brand deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function uploadLogo(req, res, next) {
  try {
    const result = await brandsService.uploadBrandLogo(req.params.id, req.file);

    return sendSuccess(res, 'Brand logo uploaded successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadLogo,
};
