const express = require('express');
const router = express.Router();
const developerController = require('../controllers/developerController');
const developerAuth = require('../middleware/developerAuth');

// 1. Developer Authentication (Public)
router.post('/login', developerController.login);

// All routes below require developer authentication (Bearer token or X-Developer-Key)
router.use(developerAuth);

// 2. Monitoring Overview & Statistics
router.get('/stats', developerController.getStats);

// 3. User Control & Monitoring
router.get('/users', developerController.getUsers);
router.put('/users/:id/status', developerController.toggleUser);

// 4. Business Control & Monitoring
router.get('/businesses', developerController.getBusinesses);

// 5. Subscription & Invoices Control & Monitoring
router.get('/subscriptions', developerController.getSubscriptions);
router.put('/subscriptions/:id', developerController.updateSubscription);
router.get('/invoices', developerController.getInvoices);

// 6. SaaS Pricing & Plans Control (Developer can adjust pricing directly)
router.get('/plans', developerController.getPlans);
router.post('/plans', developerController.createPlan);
router.put('/plans/:id', developerController.updatePlan);
router.delete('/plans/:id', developerController.deletePlan);

module.exports = router;
