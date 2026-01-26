const { v4: uuidv4 } = require('uuid');
const { logInfo } = require('../utils/logger');

/**
 * Middleware de traçage distribué
 * Génère et propage un X-Correlation-ID pour suivre les requêtes à travers les services
 */
function distributedTracing(req, res, next) {
  // Récupérer le correlation ID existant ou en générer un nouveau
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Stocker dans la requête pour utilisation ultérieure
  req.correlationId = correlationId;
  
  // Ajouter dans les headers de réponse
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Ajouter le timestamp de début pour calculer la latence
  req.startTime = Date.now();
  
  // Logger le début de la requête
  logInfo(`[${correlationId}] ${req.method} ${req.originalUrl} - START`, {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Capturer la fin de la requête pour logger
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    
    logInfo(`[${correlationId}] ${req.method} ${req.originalUrl} - END`, {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
    
    // Ajouter le temps de réponse dans les headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    originalSend.call(this, data);
  };
  
  next();
}

/**
 * Middleware pour ajouter le correlation ID aux requêtes proxy
 * À utiliser dans createProxyMiddleware onProxyReq
 */
function addCorrelationIdToProxy(proxyReq, req) {
  if (req.correlationId) {
    proxyReq.setHeader('X-Correlation-ID', req.correlationId);
  }
  
  // Ajouter également le timestamp de début de la requête
  if (req.startTime) {
    proxyReq.setHeader('X-Request-Start', req.startTime.toString());
  }
}

/**
 * Middleware pour logger les erreurs avec correlation ID
 */
function errorTracking(err, req, res, next) {
  const correlationId = req.correlationId || 'UNKNOWN';
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  
  logInfo(`[${correlationId}] ERROR - ${req.method} ${req.originalUrl}`, {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.status || 500,
    duration: `${duration}ms`,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  next(err);
}

module.exports = {
  distributedTracing,
  addCorrelationIdToProxy,
  errorTracking
};
