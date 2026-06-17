const categoriesService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function getCategories(req, res, next) {
  try {
    const result = await categoriesService.getCategories(req.query);

    return sendSuccess(res, 'Categories retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getCategoryTree(req, res, next) {
  try {
    const result = await categoriesService.getCategoryTree(req.query);

    return sendSuccess(res, 'Category tree retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getCategoryById(req, res, next) {
  try {
    const category = await categoriesService.getCategoryById(req.params.id);

    return sendSuccess(res, 'Category retrieved successfully', category);
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoriesService.createCategory(req.body);

    return sendSuccess(res, 'Category created successfully', category, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await categoriesService.updateCategory(
      req.params.id,
      req.body
    );

    return sendSuccess(res, 'Category updated successfully', category);
  } catch (error) {
    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const result = await categoriesService.deleteCategory(req.params.id);

    return sendSuccess(res, 'Category deleted successfully', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
