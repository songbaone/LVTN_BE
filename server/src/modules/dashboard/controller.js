const dashboardService = require("./service");
const { sendSuccess } = require("../../utils/apiResponse");

async function getDashboardOverview(req, res, next) {
  try {
    const result = await dashboardService.getDashboardOverview();

    return sendSuccess(
      res,
      "Dashboard overview retrieved successfully",
      result,
    );
  } catch (error) {
    return next(error);
  }
}

async function getDashboardRevenue(req, res, next) {
  try {
    const { from_date, to_date } = req.query;

    const result = await dashboardService.getDashboardRevenue(
      from_date,
      to_date,
    );

    return sendSuccess(res, "Dashboard revenue retrieved successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function getTopProducts(req, res, next) {
  try {
    const result = await dashboardService.getTopProducts();

    return sendSuccess(res, "Top products retrieved successfully", result);
  } catch (error) {
    return next(error);
  }
}

async function getRecentOrders(req, res, next) {
  try {
    const result = await dashboardService.getRecentOrders();

    return sendSuccess(res, "Recent orders retrieved successfully", result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboardOverview,
  getDashboardRevenue,
  getTopProducts,
  getRecentOrders,
};
