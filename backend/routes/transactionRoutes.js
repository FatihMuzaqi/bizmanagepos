const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createTransactionSchema, cancelTransactionSchema } = require('../validators/transactionValidator');

const { enforceLimit } = require('../middleware/subscriptionMiddleware');

// All transaction routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// POS Transaction Endpoints
router.get('/', requirePermission('sales.view'), transactionController.getTransactions);
router.post('/', requirePermission('sales.create'), enforceLimit('max_transactions'), validate(createTransactionSchema), transactionController.createTransaction);
router.get('/:id', requirePermission('sales.view'), transactionController.getTransactionDetail);
router.post('/:id/cancel', requirePermission('sales.cancel'), validate(cancelTransactionSchema), transactionController.cancelTransaction);

module.exports = router;
