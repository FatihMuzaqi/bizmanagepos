const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createRecipeSchema, updateRecipeSchema } = require('../validators/recipeValidator');

// All recipe routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Recipe CRUD Endpoints
router.get('/', requirePermission(['recipe.view', 'inventory.view']), recipeController.getRecipes);
router.post('/', requirePermission(['recipe.manage', 'recipe.create']), validate(createRecipeSchema), recipeController.createRecipe);
router.get('/product/:productId', requirePermission(['recipe.view', 'inventory.view']), recipeController.getRecipeByProduct);
router.get('/:id', requirePermission(['recipe.view', 'inventory.view']), recipeController.getRecipeDetail);
router.put('/:id', requirePermission(['recipe.manage', 'recipe.update']), validate(updateRecipeSchema), recipeController.updateRecipe);
router.delete('/:id', requirePermission(['recipe.manage', 'recipe.delete']), recipeController.deleteRecipe);

module.exports = router;
