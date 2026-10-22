const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createCategorySchema, updateCategorySchema } = require('../validators/productValidator');

// All category routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Category CRUD Endpoints
router.get('/', requirePermission(['category.view', 'product.view']), categoryController.getCategories);
router.post('/', requirePermission('category.create'), validate(createCategorySchema), categoryController.createCategory);
router.get('/:id', requirePermission(['category.view', 'product.view']), categoryController.getCategoryDetail);
router.put('/:id', requirePermission('category.update'), validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', requirePermission('category.delete'), categoryController.deleteCategory);

module.exports = router;
