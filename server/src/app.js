const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { apiRouter, paymentRoutes, webhookRoutes } = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const setupSwagger = require('./docs/swagger');
const logger = require('./config/logger');

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false // Allows Swagger UI to render smoothly
}));

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key']
}));

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short', {
    stream: { write: (msg) => logger.info(msg.trim()) }
  }));
}

// Rate Limiter
app.use('/api', apiLimiter);

// API Documentation
setupSwagger(app);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'EVE Healthcare Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount V1 API Routes
app.use('/api/v1', apiRouter);

// Mount Root Routes for direct endpoint access matching PDF requirements
app.use('/payments/webhook', webhookRoutes);
app.use('/payments', paymentRoutes);

// Serve React frontend in production if built
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/payments') || req.path.startsWith('/health') || req.path.startsWith('/docs')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Root Welcome Endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to EVE Healthcare Backend API (Node.js & Express)',
      documentation: '/docs',
      health: '/health',
      api_v1: '/api/v1'
    });
  });
}

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
