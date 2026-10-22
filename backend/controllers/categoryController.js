const categoryService = require('../services/categoryService');
const { successResponse, createdResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List all categories in active business
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories(req.business.id, req.query);
  return successResponse(res, 'Categories retrieved successfully', categories);
});

/**
 * Get category detail by ID
 */
const getCategoryDetail = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.business.id, req.params.id);
  return successResponse(res, 'Category retrieved successfully', category);
});

/**
 * Create a new category
 */
const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.business.id, req.body);
  return createdResponse(res, 'Category created successfully', category);
});

/**
 * Update an existing category
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Category updated successfully', category);
});

/**
 * Delete / Deactivate a category
 */
const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.business.id, req.params.id);
  return successResponse(res, 'Category deactivated successfully');
});

module.exports = {
  getCategories,
  getCategoryDetail,
  createCategory,
  updateCategory,
  deleteCategory
};
