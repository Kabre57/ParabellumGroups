const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const serviceRoutes = require('./service.routes');
const permissionRoutes = require('./permission.routes');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Documentation
 */
router.get('/', (req, res) => {
  res.json({
    name: 'Parabellum Auth Service API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      users: '/users',
      services: '/services',
      permissions: '/permissions',
      health: '/health'
    }
  });
});

/**
 * Mount routes
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/services', serviceRoutes);
router.use('/permissions', permissionRoutes);

/**
 * 404 handler for API routes
 * Note: Sans path spécifique, catch toutes les requêtes non matchées
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
