const recipeService = require('../services/recipeService');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List recipes for business
 */
const getRecipes = asyncHandler(async (req, res) => {
  const { recipes, totalItems, page, limit } = await recipeService.listRecipes(req.business.id, req.query);
  return paginatedResponse(res, 'Recipes retrieved successfully', recipes, { page, limit, totalItems });
});

/**
 * Get single recipe by ID
 */
const getRecipeDetail = asyncHandler(async (req, res) => {
  const recipe = await recipeService.getRecipeById(req.business.id, req.params.id);
  return successResponse(res, 'Recipe retrieved successfully', recipe);
});

/**
 * Get recipe by product ID and optional variant
 */
const getRecipeByProduct = asyncHandler(async (req, res) => {
  const recipe = await recipeService.getRecipeByProduct(
    req.business.id,
    req.params.productId,
    req.query.variant_id
  );
  return successResponse(res, 'Product recipe retrieved successfully', recipe);
});

/**
 * Create a new recipe
 */
const createRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.createRecipe(req.business.id, req.body);
  return createdResponse(res, 'Recipe created successfully', recipe);
});

/**
 * Update an existing recipe
 */
const updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.updateRecipe(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Recipe updated successfully', recipe);
});

/**
 * Delete a recipe
 */
const deleteRecipe = asyncHandler(async (req, res) => {
  await recipeService.deleteRecipe(req.business.id, req.params.id);
  return successResponse(res, 'Recipe deleted successfully');
});

module.exports = {
  getRecipes,
  getRecipeDetail,
  getRecipeByProduct,
  createRecipe,
  updateRecipe,
  deleteRecipe
};
