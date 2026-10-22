const outletService = require('../services/outletService');
const { successResponse, createdResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List all outlets in active business accessible by the authenticated user
 */
const getOutlets = asyncHandler(async (req, res) => {
  const outlets = await outletService.listOutlets(
    req.business.id,
    req.user.id,
    req.business.isOwner
  );
  return successResponse(res, 'Outlets retrieved successfully', outlets);
});

/**
 * Get outlet detail by ID
 */
const getOutletDetail = asyncHandler(async (req, res) => {
  const outlet = await outletService.getOutletById(
    req.business.id,
    req.params.id,
    req.user.id,
    req.business.isOwner
  );
  return successResponse(res, 'Outlet retrieved successfully', outlet);
});

/**
 * Create a new outlet in active business
 */
const createOutlet = asyncHandler(async (req, res) => {
  const outlet = await outletService.createOutlet(req.business.id, req.body);
  return createdResponse(res, 'Outlet created successfully', outlet);
});

/**
 * Update an outlet
 */
const updateOutlet = asyncHandler(async (req, res) => {
  const outlet = await outletService.updateOutlet(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Outlet updated successfully', outlet);
});

/**
 * Delete / Deactivate an outlet
 */
const deleteOutlet = asyncHandler(async (req, res) => {
  await outletService.deleteOutlet(req.business.id, req.params.id);
  return successResponse(res, 'Outlet deactivated successfully');
});

module.exports = {
  getOutlets,
  getOutletDetail,
  createOutlet,
  updateOutlet,
  deleteOutlet
};
