require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');

// Import routes
const employeRoutes = require('./routes/employe.routes');
const congeRoutes = require('./routes/conge.routes');
const presenceRoutes = require('./routes/presence.routes');
const evaluationRoutes = require('./routes/evaluation.routes');
const contractRoutes = require('./routes/contract.routes');
const payrollRoutes = require('./routes/payroll.routes');
const loanRoutes = require('./routes/loan.routes');
const timesheetRoutes = require('./routes/timesheet.routes');

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
    service: 'hr-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/employes', employeRoutes);
app.use('/api/conges', congeRoutes);
app.use('/api/presences', presenceRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/contracts', contractRoutes);
app.use('/payroll', payrollRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/timesheets', timesheetRoutes);

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
  logger.info(`HR Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
