const transactionService = require('../services/transactionService');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new POS sales transaction
 */
const createTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionService.createTransaction(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.body
  );
  return createdResponse(res, 'Transaction created successfully', transaction);
});

/**
 * Cancel a completed transaction and reverse inventory
 */
const cancelTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionService.cancelTransaction(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.params.id,
    req.body?.reason
  );
  return successResponse(res, 'Transaction cancelled successfully and inventory reversed', transaction);
});

/**
 * List transactions with filtering and pagination
 */
const getTransactions = asyncHandler(async (req, res) => {
  const { transactions, totalItems, page, limit } = await transactionService.listTransactions(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.query
  );
  return paginatedResponse(res, 'Transactions retrieved successfully', transactions, { page, limit, totalItems });
});

/**
 * Get transaction receipt / details by ID
 */
const getTransactionDetail = asyncHandler(async (req, res) => {
  const transaction = await transactionService.getTransactionById(
    req.business.id,
    req.user.id,
    req.business.isOwner,
    req.params.id
  );
  return successResponse(res, 'Transaction retrieved successfully', transaction);
});

module.exports = {
  createTransaction,
  cancelTransaction,
  getTransactions,
  getTransactionDetail
};
