const express = require('express');
const router = express.Router();
const modifierController = require('../controllers/modifierController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createModifierSchema, updateModifierSchema } = require('../validators/productValidator');

// All modifier routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Modifier CRUD Endpoints
router.get('/', requirePermission(['modifier.view', 'product.view']), modifierController.getModifiers);
router.post('/', requirePermission('modifier.create'), validate(createModifierSchema), modifierController.createModifier);
router.get('/:id', requirePermission(['modifier.view', 'product.view']), modifierController.getModifierDetail);
router.put('/:id', requirePermission('modifier.update'), validate(updateModifierSchema), modifierController.updateModifier);
router.delete('/:id', requirePermission('modifier.delete'), modifierController.deleteModifier);

module.exports = router;
