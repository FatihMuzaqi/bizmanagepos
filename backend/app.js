'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { NotFoundError, ForbiddenError } = require('./utils/customErrors');
const { sequelize } = require('./models');

const app = express();

// 1. Trust Reverse Proxy (Cloudflare, AWS ALB, Nginx)
app.set('trust proxy', 1);

// 2. Production Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: env.IS_PRODUCTION ? undefined : false,
    hsts: env.IS_PRODUCTION
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      : false
  })
);

// 3. CORS Configuration
const allowedOrigins = env.CORS.ORIGIN
  ? env.CORS.ORIGIN.split(',').map((o) => o.trim().toLowerCase())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, Flutter HTTP client, curl, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.toLowerCase();
    
    // In development, automatically allow localhost, 127.0.0.1, and ngrok tunnels
    if (!env.IS_PRODUCTION) {
      if (
        env.CORS.ORIGIN === '*' ||
        allowedOrigins.includes('*') ||
        normalizedOrigin.includes('localhost') ||
        normalizedOrigin.includes('127.0.0.1') ||
        normalizedOrigin.includes('ngrok')
      ) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    return callback(new ForbiddenError(`CORS policy blocked access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Business-Id',
    'X-Outlet-Id',
    'X-Request-Id',
    'ngrok-skip-browser-warning',
    'Accept',
    'Accept-Language',
    'Origin',
    'X-Requested-With',
    'X-Developer-Key'
  ]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 4. Request Logging & Body Parsers
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Global API Rate Limiting
app.use(apiLimiter);

// 6. Production Health Check Handler
const healthCheckHandler = async (req, res) => {
  try {
    // Verify database connectivity safely
    await sequelize.authenticate();
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: parseFloat(process.uptime().toFixed(2))
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/health', healthCheckHandler);
app.get('/api/v1/health', healthCheckHandler);

// 7. Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'BizManage REST API',
    version: '1.0.0',
    status: 'online',
    health: '/health'
  });
});

// 8. Mount API v1 Routes
app.use('/api/v1', apiRoutes);

// 9. Catch-all 404 Handler for Undefined Routes
app.use((req, res, next) => {
  next(new NotFoundError(`API endpoint [${req.method} ${req.originalUrl}] not found`, 'ENDPOINT_NOT_FOUND'));
});

// 10. Global Centralized Error Handler
app.use(errorHandler);

module.exports = app;
