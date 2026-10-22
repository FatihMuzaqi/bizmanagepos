const modifierService = require('../services/modifierService');
const { successResponse, createdResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List all modifiers in active business
 */
const getModifiers = asyncHandler(async (req, res) => {
  const modifiers = await modifierService.listModifiers(req.business.id, req.query);
  return successResponse(res, 'Modifiers retrieved successfully', modifiers);
});

/**
 * Get modifier detail by ID
 */
const getModifierDetail = asyncHandler(async (req, res) => {
  const modifier = await modifierService.getModifierById(req.business.id, req.params.id);
  return successResponse(res, 'Modifier retrieved successfully', modifier);
});

/**
 * Create a new modifier
 */
const createModifier = asyncHandler(async (req, res) => {
  const modifier = await modifierService.createModifier(req.business.id, req.body);
  return createdResponse(res, 'Modifier created successfully', modifier);
});

/**
 * Update an existing modifier
 */
const updateModifier = asyncHandler(async (req, res) => {
  const modifier = await modifierService.updateModifier(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Modifier updated successfully', modifier);
});

/**
 * Delete / Deactivate a modifier
 */
const deleteModifier = asyncHandler(async (req, res) => {
  await modifierService.deleteModifier(req.business.id, req.params.id);
  return successResponse(res, 'Modifier deactivated successfully');
});

module.exports = {
  getModifiers,
  getModifierDetail,
  createModifier,
  updateModifier,
  deleteModifier
};
