const inventoryService = require('../services/inventoryService');
const { getUserAllowedOutlets } = require('../services/rbacService');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/apiResponse');
const { ValidationError, ForbiddenError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper to check user outlet access
 */
const verifyOutletAccess = async (userId, businessId, isOwner, outletId) => {
  const allowedOutletIds = await getUserAllowedOutlets(userId, businessId, isOwner);
  if (!allowedOutletIds.includes(Number(outletId))) {
    throw new ForbiddenError('You do not have access to manage inventory for this outlet');
  }
};

/**
 * Record Stock In
 */
const stockIn = asyncHandler(async (req, res) => {
  await verifyOutletAccess(req.user.id, req.business.id, req.business.isOwner, req.body.outlet_id);
  const result = await inventoryService.recordStockIn(req.business.id, req.user.id, req.body);
  return createdResponse(res, 'Stock in recorded successfully', result);
});

/**
 * Record Stock Out
 */
const stockOut = asyncHandler(async (req, res) => {
  await verifyOutletAccess(req.user.id, req.business.id, req.business.isOwner, req.body.outlet_id);
  const result = await inventoryService.recordStockOut(req.business.id, req.user.id, req.body);
  return createdResponse(res, 'Stock out recorded successfully', result);
});

/**
 * Record Stock Adjustment / Opname
 */
const stockAdjustment = asyncHandler(async (req, res) => {
  await verifyOutletAccess(req.user.id, req.business.id, req.business.isOwner, req.body.outlet_id);
  const result = await inventoryService.recordStockAdjustment(req.business.id, req.user.id, req.body);
  return createdResponse(res, 'Stock adjustment recorded successfully', result);
});

/**
 * Get current stock levels for an outlet
 */
const getOutletStock = asyncHandler(async (req, res) => {
  const outletId = req.query.outlet_id || req.headers['x-outlet-id'];
  if (!outletId) {
    throw new ValidationError('outlet_id query parameter or x-outlet-id header is required');
  }

  await verifyOutletAccess(req.user.id, req.business.id, req.business.isOwner, outletId);
  const result = await inventoryService.getOutletStockList(req.business.id, outletId, req.query);
  return successResponse(res, 'Outlet stock levels retrieved successfully', result);
});

/**
 * Get current stock level for a single ingredient in an outlet
 */
const getIngredientStock = asyncHandler(async (req, res) => {
  const outletId = req.query.outlet_id || req.headers['x-outlet-id'];
  if (!outletId) {
    throw new ValidationError('outlet_id query parameter or x-outlet-id header is required');
  }

  await verifyOutletAccess(req.user.id, req.business.id, req.business.isOwner, outletId);
  const result = await inventoryService.getIngredientStock(req.business.id, outletId, req.params.ingredientId);
  return successResponse(res, 'Ingredient stock retrieved successfully', result);
});

/**
 * Get stock movements history
 */
const getStockMovements = asyncHandler(async (req, res) => {
  if (req.query.outlet_id) {
    await verifyOutletAccess(req.user.id, req.business.id, req.business.isOwner, req.query.outlet_id);
  }

  const { movements, totalItems, page, limit } = await inventoryService.listStockMovements(
    req.business.id,
    req.query
  );
  return paginatedResponse(res, 'Stock movements retrieved successfully', movements, { page, limit, totalItems });
});

/**
 * Get stock movements for a specific ingredient
 */
const getIngredientMovements = asyncHandler(async (req, res) => {
  if (req.query.outlet_id) {
    await verifyOutletAccess(req.user.id, req.business.id, req.business.isOwner, req.query.outlet_id);
  }

  const { movements, totalItems, page, limit } = await inventoryService.listStockMovements(
    req.business.id,
    { ...req.query, ingredient_id: req.params.ingredientId }
  );
  return paginatedResponse(res, 'Ingredient stock movements retrieved successfully', movements, { page, limit, totalItems });
});

module.exports = {
  stockIn,
  stockOut,
  stockAdjustment,
  getOutletStock,
  getIngredientStock,
  getStockMovements,
  getIngredientMovements
};
