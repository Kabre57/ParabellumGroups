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
  commercialServiceLimiter,
  inventoryServiceLimiter,
  hrServiceLimiter,
  billingServiceLimiter,
  analyticsServiceLimiter,
  notificationsServiceLimiter
} = require('../middleware/serviceLimiters');

const router = express.Router();

/**
 * Crée un middleware proxy avec configuration de base
 */
const createProxy = (target, pathRewriteConfig = {}) => {
  const proxyConfig = {
    target,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      if (req.user) {
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
  };

  if (typeof pathRewriteConfig === 'function') {
    proxyConfig.pathRewrite = pathRewriteConfig;
  } else if (pathRewriteConfig && Object.keys(pathRewriteConfig).length > 0) {
    proxyConfig.pathRewrite = pathRewriteConfig;
  }

  return createProxyMiddleware(proxyConfig);
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
            path: '/health',
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

const rewriteAuthPath = (path) => {
  if (path.startsWith('/api/auth/users') || path.startsWith('/auth/users')) {
    return path.replace(/^\/?api?\/auth\/users/, '/api/users');
  }
  if (path.startsWith('/api/auth/roles') || path.startsWith('/auth/roles')) {
    return path.replace(/^\/?api?\/auth\/roles/, '/api/roles');
  }
  if (path.startsWith('/api/auth/services') || path.startsWith('/auth/services')) {
    return path.replace(/^\/?api?\/auth\/services/, '/api/services');
  }
  if (path.startsWith('/api/auth/permissions') || path.startsWith('/auth/permissions')) {
    return path.replace(/^\/?api?\/auth\/permissions/, '/api/permissions');
  }
  return path.replace(/^\/?api?\/auth/, '/api/auth');
};

const rewriteTechnicalPath = (path) => {
  const [pathname, query] = path.split('?');
  let normalized = pathname;

  if (normalized.startsWith('/api/')) {
    normalized = normalized.slice(4);
  }

  if (normalized.startsWith('/technical')) {
    normalized = normalized.slice('/technical'.length);
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (normalized === '/') {
    normalized = '';
  }

  const rewritten = `/api${normalized}`;
  return query ? `${rewritten}?${query}` : rewritten;
};

const rewriteProjectsPath = (path) => {
  const tasksMatch = path.match(/^\/projects\/([^\/]+)\/tasks(\/[^?]*)?(\?.*)?$/);
  if (tasksMatch) {
    const projectId = tasksMatch[1];
    const tail = tasksMatch[2] || '';
    const query = tasksMatch[3] || '';
    const queryPrefix = query ? `${query}&` : '?';
    return `/api/taches${tail}${queryPrefix}projetId=${encodeURIComponent(projectId)}`;
  }

  return path.replace(/^\/projects/, '/api/projets');
};

const rewriteProcurementPath = (path) => {
  if (path.startsWith('/procurement/orders')) {
    return path.replace('/procurement/orders', '/api/bons-commande');
  }
  if (path.startsWith('/procurement/requests')) {
    return path.replace('/procurement/requests', '/api/demandes-achat');
  }
  if (path.startsWith('/procurement/suppliers')) {
    return path.replace('/procurement/suppliers', '/api/fournisseurs');
  }
  return path.replace(/^\/procurement/, '/api');
};

const rewriteCommunicationPath = (path) => path.replace(/^\/communication/, '/api');

const rewriteHrPath = (path) => {
  const employeeContractsMatch = path.match(/^\/hr\/employees\/([^\/]+)\/contracts(\?.*)?$/);
  if (employeeContractsMatch) {
    const employeeId = employeeContractsMatch[1];
    const query = employeeContractsMatch[2] || '';
    const queryPrefix = query ? `${query}&` : '?';
    return `/contracts${queryPrefix}employeeId=${encodeURIComponent(employeeId)}`;
  }
  if (path.startsWith('/hr/employees')) {
    return path.replace('/hr/employees', '/api/employes');
  }
  if (path.startsWith('/hr/leave-requests')) {
    return path.replace('/hr/leave-requests', '/api/conges');
  }
  if (path.startsWith('/hr/presences')) {
    return path.replace('/hr/presences', '/api/presences');
  }
  if (path.startsWith('/hr/evaluations')) {
    return path.replace('/hr/evaluations', '/api/evaluations');
  }
  if (path.startsWith('/hr/contracts')) {
    return path.replace('/hr/contracts', '/contracts');
  }
  if (path.startsWith('/hr/payroll')) {
    return path.replace('/hr/payroll', '/payroll');
  }

  return path.replace(/^\/hr/, '/api');
};

const rewriteBillingPath = (path) => {
  if (path.startsWith('/billing/invoices')) {
    return path.replace('/billing/invoices', '/api/factures');
  }
  if (path.startsWith('/billing/quotes')) {
    return path.replace('/billing/quotes', '/api/devis');
  }
  if (path.startsWith('/billing/payments')) {
    return path.replace('/billing/payments', '/api/paiements');
  }
  return path.replace(/^\/billing/, '/api');
};

const rewriteCommercialPath = (path) => path.replace(/^\/commercial/, '/api/prospects');

const rewriteInventoryPath = (path) => path.replace(/^\/inventory/, '/api');

const rewriteNotificationsPath = (path) => path.replace(/^\/notifications/, '/api/notifications');

// Routes admin auth avec authentification (DOIVENT ETRE AVANT /auth generique)
router.use('/auth/users',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

router.use('/auth/roles',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

router.use('/auth/services',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

router.use('/auth/permissions',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

// Routes auth avec validation (login, register, refresh - sans authentification)
router.post('/auth/login', 
  authServiceLimiter,
  validateSchema(schemas.auth.login),
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

router.post('/auth/register',
  authServiceLimiter,
  validateSchema(schemas.auth.register),
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

router.post('/auth/refresh',
  authServiceLimiter,
  validateSchema(schemas.auth.refresh),
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

// Toutes les autres routes auth sans validation spécifique
router.use('/auth',
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, rewriteAuthPath)
);

router.use('/technical', 
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, rewriteTechnicalPath)
);

// Routes directes technical-service (pour compatibilite frontend)
router.use('/techniciens',
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, { '^/techniciens': '/api/techniciens' })
);

router.use('/missions',
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, { '^/missions': '/api/missions' })
);

router.use('/interventions',
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, { '^/interventions': '/api/interventions' })
);

router.use('/rapports',
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, { '^/rapports': '/api/rapports' })
);

router.use('/specialites',
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, { '^/specialites': '/api/specialites' })
);

router.use('/materiel',
  authenticateToken,
  technicalServiceLimiter,
  createProxy(config.SERVICES.TECHNICAL, { '^/materiel': '/api/materiel' })
);

// MODIFICATION CRITIQUE ICI - Routes customers
router.use('/customers', 
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, (path) => {
    if (path.startsWith('/customers/type-clients')) {
      return path.replace('/customers/type-clients', '/api/type-clients');
    }
    if (path.startsWith('/customers/interactions')) {
      return path.replace('/customers/interactions', '/api/interactions');
    }
    if (path.startsWith('/customers/contrats')) {
      return path.replace('/customers/contrats', '/api/contrats');
    }
    if (path.startsWith('/customers/opportunites')) {
      return path.replace('/customers/opportunites', '/api/opportunites');
    }
    if (path.startsWith('/customers/contacts')) {
      return path.replace('/customers/contacts', '/api/contacts');
    }
    if (path.startsWith('/customers/documents')) {
      return path.replace('/customers/documents', '/api/documents');
    }
    if (path.startsWith('/customers/adresses')) {
      return path.replace('/customers/adresses', '/api/adresses');
    }
    if (path.startsWith('/customers/secteurs')) {
      return path.replace('/customers/secteurs', '/api/secteurs');
    }
    return path.replace('/customers', '/api/clients');
  })
);

// Routes CRM directes (compatibles avec le frontend)
router.use('/clients',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/clients': '/api/clients' })
);

router.use('/contacts',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/contacts': '/api/contacts' })
);

router.use('/contrats',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/contrats': '/api/contrats' })
);

router.use('/interactions',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/interactions': '/api/interactions' })
);

router.use('/opportunites',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/opportunites': '/api/opportunites' })
);

router.use('/type-clients',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/type-clients': '/api/type-clients' })
);

router.use('/documents',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/documents': '/api/documents' })
);

router.use('/adresses',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/adresses': '/api/adresses' })
);

router.use('/secteurs',
  authenticateToken,
  customersServiceLimiter,
  createProxy(config.SERVICES.CUSTOMERS, { '^/secteurs': '/api/secteurs' })
);

router.use('/projects', 
  authenticateToken,
  projectsServiceLimiter,
  createProxy(config.SERVICES.PROJECTS, rewriteProjectsPath)
);

router.use('/procurement', 
  authenticateToken,
  procurementServiceLimiter,
  createProxy(config.SERVICES.PROCUREMENT, rewriteProcurementPath)
);

router.use('/communication', 
  authenticateToken,
  communicationServiceLimiter,
  createProxy(config.SERVICES.COMMUNICATION, rewriteCommunicationPath)
);

router.use('/hr', 
  authenticateToken,
  hrServiceLimiter,
  createProxy(config.SERVICES.HR, rewriteHrPath)
);

router.use('/billing', 
  authenticateToken,
  billingServiceLimiter,
  createProxy(config.SERVICES.BILLING, rewriteBillingPath)
);

router.use('/commercial',
  authenticateToken,
  commercialServiceLimiter,
  createProxy(config.SERVICES.COMMERCIAL, rewriteCommercialPath)
);

router.use('/inventory',
  authenticateToken,
  inventoryServiceLimiter,
  createProxy(config.SERVICES.INVENTORY, rewriteInventoryPath)
);

router.use('/notifications',
  authenticateToken,
  notificationsServiceLimiter,
  createProxy(config.SERVICES.NOTIFICATIONS, rewriteNotificationsPath)
);

router.use('/analytics', 
  authenticateToken,
  analyticsServiceLimiter,
  createProxy(config.SERVICES.ANALYTICS, (path) => {
    if (path.includes('/analytics/rapports')) {
      return path.replace(/.*\/analytics\/rapports/, '/api/rapports');
    }
    if (path.includes('/analytics/kpis')) {
      return path.replace(/.*\/analytics\/kpis/, '/api/kpis');
    }
    if (path.includes('/analytics/dashboards')) {
      return path.replace(/.*\/analytics\/dashboards/, '/api/dashboards');
    }
    if (path.includes('/analytics/widgets')) {
      return path.replace(/.*\/analytics\/widgets/, '/api/widgets');
    }
    if (path.includes('/analytics/overview')) {
      return path.replace(/.*\/analytics\/overview/, '/api/analytics/overview');
    }
    return path.replace(/.*\/analytics/, '/api/analytics');
  })
);

router.use('/roles',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, { '^/roles': '/api/roles' })
);

router.use('/users',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, { '^/users': '/api/users' })
);

router.use('/services',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, { '^/services': '/api/services' })
);

router.use('/permissions',
  authenticateToken,
  authServiceLimiter,
  createProxy(config.SERVICES.AUTH, { '^/permissions': '/api/permissions' })
);

module.exports = router;
