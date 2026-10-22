const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { 
  createProductSchema, 
  updateProductSchema, 
  createVariantSchema, 
  updateVariantSchema,
  attachProductModifierSchema 
} = require('../validators/productValidator');

const { enforceLimit } = require('../middleware/subscriptionMiddleware');

// All product routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// 1. Product CRUD Endpoints
router.get('/', requirePermission('product.view'), productController.getProducts);
router.post('/', requirePermission('product.create'), enforceLimit('max_products'), validate(createProductSchema), productController.createProduct);
router.get('/:id', requirePermission('product.view'), productController.getProductDetail);
router.put('/:id', requirePermission('product.update'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', requirePermission('product.delete'), productController.deleteProduct);

// 2. Product Variant Endpoints
router.get('/:productId/variants', requirePermission(['product.view', 'variant.view']), productController.getVariants);
router.post('/:productId/variants', requirePermission(['product.create', 'variant.create']), validate(createVariantSchema), productController.createVariant);
router.put('/:productId/variants/:variantId', requirePermission(['product.update', 'variant.update']), validate(updateVariantSchema), productController.updateVariant);
router.delete('/:productId/variants/:variantId', requirePermission(['product.delete', 'variant.delete']), productController.deleteVariant);

// 3. Product Modifier Linkage Endpoints
router.post('/:productId/modifiers', requirePermission(['product.update', 'modifier.create']), validate(attachProductModifierSchema), productController.attachModifier);
router.delete('/:productId/modifiers/:modifierId', requirePermission(['product.update', 'modifier.delete']), productController.detachModifier);

module.exports = router;
