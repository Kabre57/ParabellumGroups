const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./utils/config');
const corsMiddleware = require('./middleware/cors');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const proxyRoutes = require('./routes/proxy');
const { logInfo, logError } = require('./utils/logger');
const { distributedTracing, errorTracking } = require('./middleware/tracing');
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');

const app = express();

app.use(helmet());
app.use(compression());
app.use(corsMiddleware);

if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use(distributedTracing);
app.use(metricsMiddleware);
app.use(globalRateLimiter);

app.get('/health', express.json(), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Gateway is running',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

app.get('/api-docs', express.json(), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Parabellum ERP API Gateway',
    version: '1.0.0',
    services: {
      auth: `${config.SERVICES.AUTH}/api-docs`,
      technical: `${config.SERVICES.TECHNICAL}/api-docs`,
      customers: `${config.SERVICES.CUSTOMERS}/api-docs`,
      projects: `${config.SERVICES.PROJECTS}/api-docs`,
      procurement: `${config.SERVICES.PROCUREMENT}/api-docs`,
      communication: `${config.SERVICES.COMMUNICATION}/api-docs`,
      hr: `${config.SERVICES.HR}/api-docs`,
      billing: `${config.SERVICES.BILLING}/api-docs`
    }
  });
});

app.get('/metrics', express.json(), metricsHandler);

app.use('/api', proxyRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

app.use((err, req, res, next) => {
  logError('Unhandled error', err);
  errorTracking(err, req, res, next);
  res.status(500).json({
    success: false,
    message: config.NODE_ENV === 'production' 
      ? 'Une erreur interne est survenue' 
      : err.message
  });
});

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logInfo(`API Gateway started on port ${PORT}`);
  logInfo(`Environment: ${config.NODE_ENV}`);
  logInfo('Services configured:');
  Object.entries(config.SERVICES).forEach(([name, url]) => {
    logInfo(`  - ${name}: ${url}`);
  });
});

process.on('SIGTERM', () => {
  logInfo('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logInfo('HTTP server closed');
  });
});

module.exports = app;
