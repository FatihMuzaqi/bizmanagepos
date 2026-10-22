const reportService = require('../services/reportService');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get dashboard overview analytics
 */
const getDashboard = asyncHandler(async (req, res) => {
  const data = await reportService.getDashboardSummary(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Dashboard summary retrieved successfully', data);
});

/**
 * Get sales summary report
 */
const getSalesReport = asyncHandler(async (req, res) => {
  const data = await reportService.getSalesReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Sales report retrieved successfully', data);
});

/**
 * Get product sales performance report
 */
const getProductSalesReport = asyncHandler(async (req, res) => {
  const data = await reportService.getProductSalesReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Product sales report retrieved successfully', data);
});

/**
 * Get outlet comparison report
 */
const getOutletReport = asyncHandler(async (req, res) => {
  const data = await reportService.getOutletReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Outlet report retrieved successfully', data);
});

/**
 * Get expense breakdown report
 */
const getExpenseReport = asyncHandler(async (req, res) => {
  const data = await reportService.getExpenseReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Expense report retrieved successfully', data);
});

/**
 * Get inventory stock level report
 */
const getStockReport = asyncHandler(async (req, res) => {
  const data = await reportService.getStockReport(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return successResponse(res, 'Stock report retrieved successfully', data);
});

module.exports = {
  getDashboard,
  getSalesReport,
  getProductSalesReport,
  getOutletReport,
  getExpenseReport,
  getStockReport
};
