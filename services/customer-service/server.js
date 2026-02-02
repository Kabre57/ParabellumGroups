require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');

// Import routes
const clientRoutes = require('./routes/client.routes');
const contactRoutes = require('./routes/contact.routes');
const contratRoutes = require('./routes/contrat.routes');
const adresseRoutes = require('./routes/adresse.routes');
const interactionRoutes = require('./routes/interaction.routes');
const documentRoutes = require('./routes/document.routes');
const opportuniteRoutes = require('./routes/opportunite.routes');
const typeClientRoutes = require('./routes/typeClient.routes');
const secteurRoutes = require('./routes/secteur.routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4008;

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Middleware
app.use(helmet());
// Autoriser toutes les origines en développement pour faciliter l'intégration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Role', 'X-User-Email']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.headers['x-user-id']
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'crm-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    name: 'CRM Service API',
    version: '1.0.0',
    endpoints: {
      clients: '/api/clients',
      contacts: '/api/contacts',
      contrats: '/api/contrats',
      adresses: '/api/adresses',
      interactions: '/api/interactions',
      documents: '/api/documents',
      opportunites: '/api/opportunites',
      typeClients: '/api/type-clients',
      secteurs: '/api/secteurs'
    }
  });
});

// Routes
app.use('/api/clients', clientRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/contrats', contratRoutes);
app.use('/api/adresses', adresseRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/opportunites', opportuniteRoutes);
app.use('/api/type-clients', typeClientRoutes);
app.use('/api/secteurs', secteurRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route non trouvée',
    message: `La route ${req.method} ${req.path} n'existe pas`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.headers['x-user-id']
  });

  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: isProduction ? 'Erreur interne du serveur' : err.message,
    details: isProduction ? undefined : err.stack,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`CRM Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };