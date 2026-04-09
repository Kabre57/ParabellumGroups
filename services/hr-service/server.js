const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8001;

// Config Logger (Winston)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ],
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes de base pour vérifier si le service fonctionne
app.get('/api/ping', (req, res) => {
  res.json({ message: 'HR Service is running' });
});

// Importer les routers
const employeRoutes = require('./routes/employe.routes');
const contractRoutes = require('./routes/contract.routes');
const congeRoutes = require('./routes/conge.routes');
const loanRoutes = require('./routes/loan.routes');
const presenceRoutes = require('./routes/presence.routes');
const payrollRoutes = require('./routes/payroll.routes');
const evaluationRoutes = require('./routes/evaluation.routes');
const logipaieRoutes = require('./routes/logipaie.routes');

app.use('/api/employes', employeRoutes);
app.use('/api/contrats', contractRoutes);
app.use('/api/conges', congeRoutes);
app.use('/api/prets', loanRoutes);
app.use('/api/presences', presenceRoutes);
app.use('/api/paie', payrollRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/exports', logipaieRoutes);
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/recruitment', require('./routes/recruitment.routes'));
app.use('/api/formation', require('./routes/formation.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/portal', require('./routes/portal.routes'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: 'Une erreur interne est survenue', details: err.message });
});

// Start Server
app.listen(PORT, async () => {
    try {
        await prisma.$connect();
        logger.info(`Database connected successfully.`);
        logger.info(`HR Service started on port ${PORT}`);
    } catch (e) {
        logger.error(`Failed to connect to database: ${e.message}`);
    }
});

module.exports = app;
