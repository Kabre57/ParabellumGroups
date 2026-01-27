const cors = require('cors');
const config = require('../utils/config');

// Configuration simple de CORS
const corsOptions = {
  origin: 'http://localhost:3000', // Autorisez SEULEMENT le frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Role'],
  exposedHeaders: ['X-Correlation-ID']
};

module.exports = cors(corsOptions);