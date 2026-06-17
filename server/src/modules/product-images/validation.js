const { param } = require('express-validator');

const productIdParamValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Invalid product ID')
    .toInt(),
];

const imageIdParamValidation = [
  param('imageId')
    .isInt({ min: 1 })
    .withMessage('Invalid image ID')
    .toInt(),
];

const productImageParamsValidation = [
  ...productIdParamValidation,
  ...imageIdParamValidation,
];

module.exports = {
  productIdParamValidation,
  imageIdParamValidation,
  productImageParamsValidation,
};
