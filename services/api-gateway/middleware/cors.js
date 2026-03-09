const cors = require('cors');
const config = require('../utils/config');

// Configuration CORS avec support multi-origins
const corsOptions = {
  origin: config.ALLOWED_ORIGINS || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Role'],
  exposedHeaders: ['X-Correlation-ID']
};

module.exports = cors(corsOptions);