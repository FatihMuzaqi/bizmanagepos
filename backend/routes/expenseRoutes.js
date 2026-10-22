const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const {
  createExpenseSchema,
  updateExpenseSchema,
  cancelExpenseSchema
} = require('../validators/expenseValidator');

// All expense routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Expense Endpoints
router.get('/', requirePermission('expense.view'), expenseController.getExpenses);
router.post('/', requirePermission('expense.create'), validate(createExpenseSchema), expenseController.createExpense);
router.get('/:id', requirePermission('expense.view'), expenseController.getExpenseDetail);
router.put('/:id', requirePermission('expense.update'), validate(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', requirePermission('expense.delete'), expenseController.deleteExpense);
router.post('/:id/cancel', requirePermission(['expense.update', 'expense.delete']), validate(cancelExpenseSchema), expenseController.cancelExpense);

module.exports = router;
