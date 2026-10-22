const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');
const validate = require('../middleware/validate');
const { createUnitSchema, updateUnitSchema } = require('../validators/inventoryValidator');

// All unit routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

// Unit Endpoints
router.get('/', requirePermission(['unit.view', 'inventory.view']), unitController.getUnits);
router.post('/', requirePermission(['unit.create', 'inventory.create']), validate(createUnitSchema), unitController.createUnit);
router.get('/:id', requirePermission(['unit.view', 'inventory.view']), unitController.getUnitDetail);
router.put('/:id', requirePermission(['unit.update', 'inventory.create']), validate(updateUnitSchema), unitController.updateUnit);
router.delete('/:id', requirePermission(['unit.delete', 'inventory.create']), unitController.deleteUnit);

module.exports = router;
