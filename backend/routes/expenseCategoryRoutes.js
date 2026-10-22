const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const {
  createExpenseCategorySchema,
  updateExpenseCategorySchema
} = require('../validators/expenseValidator');

// All expense category routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Expense Category CRUD Endpoints
router.get('/', requirePermission(['expense.view', 'report.view']), expenseController.getExpenseCategories);
router.post('/', requirePermission('expense.create'), validate(createExpenseCategorySchema), expenseController.createExpenseCategory);
router.get('/:id', requirePermission(['expense.view', 'report.view']), expenseController.getExpenseCategoryDetail);
router.put('/:id', requirePermission('expense.update'), validate(updateExpenseCategorySchema), expenseController.updateExpenseCategory);
router.delete('/:id', requirePermission('expense.delete'), expenseController.deleteExpenseCategory);

module.exports = router;
