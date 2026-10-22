const expenseService = require('../services/expenseService');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ==============================================================
// EXPENSE CATEGORY HANDLERS
// ==============================================================

const getExpenseCategories = asyncHandler(async (req, res) => {
  const categories = await expenseService.listExpenseCategories(req.business.id, req.query);
  return successResponse(res, 'Expense categories retrieved successfully', categories);
});

const getExpenseCategoryDetail = asyncHandler(async (req, res) => {
  const category = await expenseService.getExpenseCategoryById(req.business.id, req.params.id);
  return successResponse(res, 'Expense category retrieved successfully', category);
});

const createExpenseCategory = asyncHandler(async (req, res) => {
  const category = await expenseService.createExpenseCategory(req.business.id, req.body);
  return createdResponse(res, 'Expense category created successfully', category);
});

const updateExpenseCategory = asyncHandler(async (req, res) => {
  const category = await expenseService.updateExpenseCategory(req.business.id, req.params.id, req.body);
  return successResponse(res, 'Expense category updated successfully', category);
});

const deleteExpenseCategory = asyncHandler(async (req, res) => {
  const result = await expenseService.deleteExpenseCategory(req.business.id, req.params.id);
  return successResponse(res, result.message, result);
});

// ==============================================================
// EXPENSE HANDLERS
// ==============================================================

const getExpenses = asyncHandler(async (req, res) => {
  const { expenses, totalItems, page, limit } = await expenseService.listExpenses(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return paginatedResponse(res, 'Expenses retrieved successfully', expenses, { page, limit, totalItems });
});

const getExpenseDetail = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.params.id
  );
  return successResponse(res, 'Expense retrieved successfully', expense);
});

const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.body
  );
  return createdResponse(res, 'Expense recorded successfully', expense);
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.params.id,
    req.body
  );
  return successResponse(res, 'Expense updated successfully', expense);
});

const cancelExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.cancelExpense(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.params.id,
    req.body?.reason
  );
  return successResponse(res, 'Expense cancelled successfully', expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.params.id
  );
  return successResponse(res, 'Expense deleted successfully');
});

module.exports = {
  getExpenseCategories,
  getExpenseCategoryDetail,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenses,
  getExpenseDetail,
  createExpense,
  updateExpense,
  cancelExpense,
  deleteExpense
};
