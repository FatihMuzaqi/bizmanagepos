const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticate = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/permissionMiddleware');

// All report routes require authentication, tenant context, and report.view permission
router.use(authenticate);
router.use(tenantContext);
router.use(requirePermission('report.view'));

// Report Endpoints
router.get('/dashboard', reportController.getDashboard);
router.get('/sales', reportController.getSalesReport);
router.get('/products', reportController.getProductSalesReport);
router.get('/outlets', reportController.getOutletReport);
router.get('/expenses', reportController.getExpenseReport);
router.get('/stock', reportController.getStockReport);

// Export Endpoints (Excel & CSV)
router.get('/export/excel', reportController.exportExcelReport);
router.get('/export/csv', reportController.exportCsvReport);

module.exports = router;
