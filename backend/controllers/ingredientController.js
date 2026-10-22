const ingredientService = require('../services/ingredientService');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List ingredients with pagination and search
 */
const getIngredients = asyncHandler(async (req, res) => {
  const { ingredients, totalItems, page, limit } = await ingredientService.listIngredients(req.business.id, req.query);
  return paginatedResponse(res, 'Ingredients retrieved successfully', ingredients, { page, limit, totalItems });
});

/**
 * Get ingredient detail by ID
 */
const getIngredientDetail = asyncHandler(async (req, res) => {
  const ingredient = await ingredientService.getIngredientById(req.business.id, req.params.id);
  return successResponse(res, 'Ingredient retrieved successfully', ingredient);
});

/**
 * Create a new ingredient
 */
const createIngredient = asyncHandler(async (req, res) => {
  const ingredient = await ingredientService.createIngredient(req.business.id, req.body);
  return createdResponse(res, 'Ingredient created successfully', ingredient);
});

/**
 * Update an existing ingredient
 */
const updateIngredient = asyncHandler(async (req, res) => {
  const ingredient = await ingredientService.updateIngredient(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Ingredient updated successfully', ingredient);
});

/**
 * Delete or deactivate an ingredient
 */
const deleteIngredient = asyncHandler(async (req, res) => {
  const result = await ingredientService.deleteIngredient(req.business.id, req.params.id);
  return successResponse(res, result.message, result);
});

module.exports = {
  getIngredients,
  getIngredientDetail,
  createIngredient,
  updateIngredient,
  deleteIngredient
};
