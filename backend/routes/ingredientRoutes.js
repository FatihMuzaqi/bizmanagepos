const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createIngredientSchema, updateIngredientSchema } = require('../validators/inventoryValidator');

// All ingredient routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Ingredient Endpoints
router.get('/', requirePermission('inventory.view'), ingredientController.getIngredients);
router.post('/', requirePermission('inventory.create'), validate(createIngredientSchema), ingredientController.createIngredient);
router.get('/:id', requirePermission('inventory.view'), ingredientController.getIngredientDetail);
router.put('/:id', requirePermission(['inventory.update', 'inventory.create']), validate(updateIngredientSchema), ingredientController.updateIngredient);
router.delete('/:id', requirePermission(['inventory.delete', 'inventory.create']), ingredientController.deleteIngredient);

module.exports = router;
