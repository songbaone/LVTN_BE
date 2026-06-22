const stocksService = require('./service');
const { sendSuccess } = require('../../utils/apiResponse');

async function listStocks(req, res, next) {
  try {
    const result = await stocksService.listStocks(req.query);
    return sendSuccess(res, 'Stocks retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getProductStock(req, res, next) {
  try {
    const result = await stocksService.getProductStock(req.params.productId);
    return sendSuccess(res, 'Product stock retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function importStock(req, res, next) {
  try {
    const result = await stocksService.importStock(req.body, req.user);
    return sendSuccess(res, 'Stock imported successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function adjustStock(req, res, next) {
  try {
    const result = await stocksService.adjustStock(req.body, req.user);
    return sendSuccess(res, 'Stock adjusted successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function updateVariantStock(req, res, next) {
  try {
    const result = await stocksService.updateVariantStock(
      req.params.variantId,
      req.body,
      req.user
    );
    return sendSuccess(res, 'Variant stock updated successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function getLowStock(req, res, next) {
  try {
    const threshold = req.query.threshold
      ? parseInt(req.query.threshold, 10)
      : 10;
    const result = await stocksService.getLowStock(threshold);
    return sendSuccess(res, 'Low stock variants retrieved successfully', {
      variants: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getOutOfStock(req, res, next) {
  try {
    const result = await stocksService.getOutOfStock();
    return sendSuccess(res, 'Out of stock variants retrieved successfully', {
      variants: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const result = await stocksService.getDashboard();
    return sendSuccess(res, 'Stock dashboard retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
}

async function exportTemplate(req, res, next) {
  try {
    const workbook = await stocksService.exportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=stock-import-template.xlsx'
    );
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return next(error);
  }
}

async function previewImport(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return sendSuccess(res, 'No file uploaded', { valid_rows: [], invalid_rows: [] });
    }
    const result = await stocksService.previewImport(file);
    return sendSuccess(res, 'Import preview generated', result);
  } catch (error) {
    return next(error);
  }
}

async function importExcel(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return sendSuccess(res, 'No file uploaded', {
        total_rows: 0,
        success_rows: 0,
        failed_rows: 0,
        errors: [],
      });
    }
    const result = await stocksService.importExcel(file, req.user);
    return sendSuccess(res, 'Excel import completed', result);
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    return next(error);
  }
}

async function exportReport(req, res, next) {
  try {
    const workbook = await stocksService.exportReport();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=stock-report.xlsx'
    );
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listStocks,
  getProductStock,
  importStock,
  adjustStock,
  updateVariantStock,
  getLowStock,
  getOutOfStock,
  getDashboard,
  exportTemplate,
  previewImport,
  importExcel,
  exportReport,
};