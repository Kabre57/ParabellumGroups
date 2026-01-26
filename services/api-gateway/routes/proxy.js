const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../utils/config');
const { authenticateToken } = require('../middleware/auth');
const { logError, logInfo } = require('../utils/logger');
const { createCircuitBreaker, getBreakerStats } = require('../middleware/circuitBreaker');
const { updateCircuitBreakerState, recordCircuitBreakerError } = require('../middleware/metrics');
const { validateSchema, schemas } = require('../middleware/validation');
const {
  authServiceLimiter,
  technicalServiceLimiter,
  customersServiceLimiter,
  projectsServiceLimiter,
  procurementServiceLimiter,
  communicationServiceLimiter,
  hrServiceLimiter,
  billingServiceLimiter,
  analyticsServiceLimiter
} = require('../middleware/serviceLimiters');

const router = express.Router();

/**
 * Crée un middleware proxy avec configuration de base
 */
const createProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      if (req.user) {
        // Support both 'id' and 'userId' from JWT payload
        const userId = req.user.id || req.user.userId;
        if (userId) {
          proxyReq.setHeader('X-User-Id', userId.toString());
        }
        if (req.user.role) {
          proxyReq.setHeader('X-User-Role', req.user.role);
        }
        if (req.user.email) {
          proxyReq.setHeader('X-User-Email', req.user.email);
        }
      }
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
      }
    },
    onError: (err, req, res) => {
      logError(`Proxy error for ${req.path}`, err);
      res.status(500).json({
        success: false,
        message: 'Erreur de communication avec le service'
      });
    }
  });
};

/**
 * Stockage des circuit breakers par service
 */
const circuitBreakers = {};

/**
 * Crée ou récupère un circuit breaker pour un service
 */
function getOrCreateBreaker(serviceName, customOptions = {}) {
  if (!circuitBreakers[serviceName]) {
    const http = require('http');
    const url = require('url');
    
    const breaker = createCircuitBreaker(
      async (targetUrl) => {
        return new Promise((resolve, reject) => {
          const parsedUrl = url.parse(targetUrl);
          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: '/api/health',
            method: 'GET',
            timeout: 5000
          };
          
          const req = http.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 404) {
              resolve(true);
            } else {
              reject(new Error(`Service unhealthy: ${res.statusCode}`));
            }
          });
          
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Health check timeout'));
          });
          req.end();
        });
      },
      serviceName,
      { timeout: 5000, ...customOptions }
    );

    breaker.on('open', () => {
      logError(`Circuit breaker OPENED for ${serviceName}`);
      updateCircuitBreakerState(serviceName, 'open');
    });

    breaker.on('halfOpen', () => {
      logInfo(`Circuit breaker HALF-OPEN for ${serviceName}`);
      updateCircuitBreakerState(serviceName, 'halfOpen');
    });

    breaker.on('close', () => {
      logInfo(`Circuit breaker CLOSED for ${serviceName}`);
      updateCircuitBreakerState(serviceName, 'close');
    });

    breaker.on('failure', () => {
      recordCircuitBreakerError(serviceName, 'failure');
    });

    breaker.on('timeout', () => {
      recordCircuitBreakerError(serviceName, 'timeout');
    });

    breaker.on('reject', () => {
      recordCircuitBreakerError(serviceName, 'reject');
    });

    circuitBreakers[serviceName] = breaker;
  }
  
  return circuitBreakers[serviceName];
}

/**
 * Wrapper pour intégrer Circuit Breaker avec le proxy
 */
const createResilientProxy = (serviceName, target, pathRewrite = {}) => {
  const proxy = createProxy(target, pathRewrite);
  const breaker = getOrCreateBreaker(serviceName, target);
  
  return (req, res, next) => {
    if (breaker.opened || breaker.isOpen) {
      logInfo(`Circuit breaker is OPEN for ${serviceName} - rejecting request`);
      return res.status(503).json({
        success: false,
        error: 'Service temporairement indisponible',
        message: 'Le service est en cours de récupération. Veuillez réessayer dans quelques instants.',
        service: serviceName
      });
    }
    
    proxy(req, res, (err) => {
      if (err) {
        breaker.fire(target).catch(() => {});
      }
      if (next && err) next(err);
    });
  };
};

// Routes auth avec validation
router.post('/auth/login', 
  authServiceLimiter,
  validateSchema(schemas.auth.login),
  createProxy(config.SERVICES.AUTH, { '^/api/auth': '/api/auth' })
);

router.post('/auth/register',
  authServiceLimiter,
  validateSchema(schemas.auth.register),
  createProxy(config.SERVICES.AUTH, { '^/api/auth': '/api/auth' })
);

router.post('/auth/refresh',
  authServiceLimiter,
  validateSchema(schemas.auth.refresh),
  createProxy(config.SERVICES.AUTH, { '^/api/auth': '/api/auth' })
);

// Toutes les autres routes auth sans validation spécifique
router.use('/auth',
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, { '^/api/auth': '/api/auth' })
);

router.use('/technical', 
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, { '^/api/technical': '/api' })
);

router.use('/customers', 
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/api/customers': '' })
);

router.use('/projects', 
  authenticateToken,
  projectsServiceLimiter,
  createProxy(config.SERVICES.PROJECTS, { '^/api/projects': '' })
);

router.use('/procurement', 
  authenticateToken,
  procurementServiceLimiter,
  createProxy(config.SERVICES.PROCUREMENT, { '^/api/procurement': '' })
);

router.use('/communication', 
  authenticateToken,
  communicationServiceLimiter,
  createProxy(config.SERVICES.COMMUNICATION, { '^/api/communication': '' })
);

router.use('/hr', 
  authenticateToken,
  hrServiceLimiter,
  createProxy(config.SERVICES.HR, { '^/api/hr': '' })
);

router.use('/billing', 
  authenticateToken,
  billingServiceLimiter,
  createProxy(config.SERVICES.BILLING, { '^/api/billing': '' })
);

router.use('/analytics', 
  authenticateToken,
  analyticsServiceLimiter,
  createProxy(config.SERVICES.ANALYTICS, { '^/api/analytics': '' })
);

module.exports = router;
