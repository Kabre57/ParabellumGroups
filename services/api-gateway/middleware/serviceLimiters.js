const rateLimit = require('express-rate-limit');
const { recordRateLimitHit } = require('./metrics');

/**
 * Configuration de base pour les rate limiters
 */
const createServiceLimiter = (serviceName, options = {}) => {
  const defaultOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    handler: (req, res) => {
      recordRateLimitHit(serviceName);
      res.status(429).json({
        success: false,
        error: `Trop de requêtes vers le service ${serviceName}`,
        message: 'Vous avez dépassé la limite de requêtes. Veuillez réessayer plus tard.',
        service: serviceName,
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Rate limiter pour le service Auth
 * Plus strict car opérations sensibles (login, register)
 * 50 requêtes / 15 minutes
 */
const authServiceLimiter = createServiceLimiter('auth', {
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Trop de requêtes vers le service auth'
  }
});

/**
 * Rate limiter pour le service Technical
 * Modéré - 100 requêtes / 15 minutes
 */
const technicalServiceLimiter = createServiceLimiter('technical', {
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Rate limiter pour le service Customers
 * Modéré - 100 requêtes / 15 minutes
 */
const customersServiceLimiter = createServiceLimiter('customers', {
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Rate limiter pour le service Projects
 * Modéré - 100 requêtes / 15 minutes
 */
const projectsServiceLimiter = createServiceLimiter('projects', {
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Rate limiter pour le service Procurement
 * Modéré - 100 requêtes / 15 minutes
 */
const procurementServiceLimiter = createServiceLimiter('procurement', {
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Rate limiter pour le service Communication
 * Plus souple - 200 requêtes / 15 minutes
 * (notifications, emails, etc.)
 */
const communicationServiceLimiter = createServiceLimiter('communication', {
  windowMs: 15 * 60 * 1000,
  max: 200
});

/**
 * Rate limiter pour le service Commercial
 * ModÃ©rÃ© - 100 requÃªtes / 15 minutes
 */
const commercialServiceLimiter = createServiceLimiter('commercial', {
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Rate limiter pour le service Inventory
 * ModÃ©rÃ© - 100 requÃªtes / 15 minutes
 */
const inventoryServiceLimiter = createServiceLimiter('inventory', {
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Rate limiter pour le service HR
 * Modéré - 100 requêtes / 15 minutes
 */
const hrServiceLimiter = createServiceLimiter('hr', {
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Rate limiter pour le service Billing
 * Plus strict - 50 requêtes / 15 minutes
 * (opérations financières sensibles)
 */
const billingServiceLimiter = createServiceLimiter('billing', {
  windowMs: 15 * 60 * 1000,
  max: 50
});

/**
 * Rate limiter pour le service Analytics
 * Plus souple - 200 requêtes / 15 minutes
 * (requêtes de reporting, dashboards)
 */
const analyticsServiceLimiter = createServiceLimiter('analytics', {
  windowMs: 15 * 60 * 1000,
  max: 200
});

/**
 * Rate limiter pour le service Notifications
 * Plus souple - 200 requÃªtes / 15 minutes
 */
const notificationsServiceLimiter = createServiceLimiter('notifications', {
  windowMs: 15 * 60 * 1000,
  max: 200
});

module.exports = {
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
};
