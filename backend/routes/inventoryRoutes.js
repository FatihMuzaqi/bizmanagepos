const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const {
  stockInSchema,
  stockOutSchema,
  stockAdjustmentSchema
} = require('../validators/inventoryValidator');

// All inventory routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Stock Movement Actions
router.post('/stock-in', requirePermission(['inventory.adjust', 'inventory.create']), validate(stockInSchema), inventoryController.stockIn);
router.post('/stock-out', requirePermission(['inventory.adjust']), validate(stockOutSchema), inventoryController.stockOut);
router.post('/adjustment', requirePermission(['inventory.adjust']), validate(stockAdjustmentSchema), inventoryController.stockAdjustment);

// Stock Level Queries
router.get('/stock', requirePermission('inventory.view'), inventoryController.getOutletStock);
router.get('/stock/:ingredientId', requirePermission('inventory.view'), inventoryController.getIngredientStock);

// Stock Movement History
router.get('/movements', requirePermission('inventory.view'), inventoryController.getStockMovements);
router.get('/movements/:ingredientId', requirePermission('inventory.view'), inventoryController.getIngredientMovements);

module.exports = router;
