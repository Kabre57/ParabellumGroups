require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');

// Import routes
const fournisseurRoutes = require('./routes/fournisseur.routes');
const demandeAchatRoutes = require('./routes/demandeAchat.routes');
const bonCommandeRoutes = require('./routes/bonCommande.routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4009;

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
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'procurement-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/demandes-achat', demandeAchatRoutes);
app.use('/api/bons-commande', bonCommandeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Procurement Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
