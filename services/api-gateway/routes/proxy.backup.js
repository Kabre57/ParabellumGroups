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
const {
  createProxy,
  createResilientProxy,
  rewriteAuthPath,
  rewriteTechnicalPath,
  rewriteProjectsPath,
  rewriteProcurementPath,
  rewriteCommunicationPath,
  rewriteHrPath,
  rewriteBillingPath,
  rewriteCommercialPath,
  rewriteInventoryPath,
  rewriteNotificationsPath,
} = require('./proxy.backup.helpers');

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
