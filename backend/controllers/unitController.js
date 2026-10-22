const unitService = require('../services/unitService');
const { successResponse, createdResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List all units for the current business
 */
const getUnits = asyncHandler(async (req, res) => {
  const units = await unitService.listUnits(req.business.id, req.query);
  return successResponse(res, 'Measurement units retrieved successfully', units);
});

/**
 * Get unit detail by ID
 */
const getUnitDetail = asyncHandler(async (req, res) => {
  const unit = await unitService.getUnitById(req.business.id, req.params.id);
  return successResponse(res, 'Unit retrieved successfully', unit);
});

/**
 * Create a new measurement unit
 */
const createUnit = asyncHandler(async (req, res) => {
  const unit = await unitService.createUnit(req.business.id, req.body);
  return createdResponse(res, 'Unit created successfully', unit);
});

/**
 * Update an existing measurement unit
 */
const updateUnit = asyncHandler(async (req, res) => {
  const unit = await unitService.updateUnit(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Unit updated successfully', unit);
});

/**
 * Delete a measurement unit
 */
const deleteUnit = asyncHandler(async (req, res) => {
  await unitService.deleteUnit(req.business.id, req.params.id);
  return successResponse(res, 'Unit deleted successfully');
});

module.exports = {
  getUnits,
  getUnitDetail,
  createUnit,
  updateUnit,
  deleteUnit
};
