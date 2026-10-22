const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema 
} = require('../validators/authValidator');

const { authLimiter, sensitiveLimiter } = require('../middleware/rateLimitMiddleware');

// Public Routes (Protected by Auth Rate Limiter)
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', authLimiter, validate(refreshTokenSchema), authController.refreshToken);

// Protected Routes (Require JWT)
router.use(authenticate);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.put('/profile', validate(updateProfileSchema), authController.updateProfile);
router.put('/password', sensitiveLimiter, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
