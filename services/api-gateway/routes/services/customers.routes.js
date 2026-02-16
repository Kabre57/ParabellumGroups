const config = require('../../utils/config');
const { customersServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour customers-service
 */
const rewriteCustomersPath = (path) => {
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
};

/**
 * Configuration des routes customers-service
 */
module.exports = {
  serviceName: 'CUSTOMERS',
  basePath: config.SERVICES.CUSTOMERS,
  pathRewrite: rewriteCustomersPath,
  limiter: customersServiceLimiter,
  
  routes: [
    {
      path: '/customers',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
    },
    // Routes directes CRM
    {
      path: '/clients',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
      pathRewrite: { '^/clients': '/api/clients' },
    },
    {
      path: '/contacts',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
      pathRewrite: { '^/contacts': '/api/contacts' },
    },
    {
      path: '/contrats',
      auth: true,
      permission: {
        GET: 'contracts.read',
        POST: 'contracts.create',
        PUT: 'contracts.update',
        PATCH: 'contracts.update',
        DELETE: 'contracts.delete'
      },
      pathRewrite: { '^/contrats': '/api/contrats' },
    },
    {
      path: '/interactions',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
      pathRewrite: { '^/interactions': '/api/interactions' },
    },
    {
      path: '/opportunites',
      auth: true,
      permission: { GET: 'opportunities.read' },
      pathRewrite: { '^/opportunites': '/api/opportunites' },
    },
    {
      path: '/type-clients',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
      pathRewrite: { '^/type-clients': '/api/type-clients' },
    },
    {
      path: '/documents',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
      pathRewrite: { '^/documents': '/api/documents' },
    },
    {
      path: '/adresses',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
      pathRewrite: { '^/adresses': '/api/adresses' },
    },
    {
      path: '/secteurs',
      auth: true,
      permission: {
        GET: 'customers.read',
        POST: 'customers.create',
        PUT: 'customers.update',
        PATCH: 'customers.update',
        DELETE: 'customers.delete'
      },
      pathRewrite: { '^/secteurs': '/api/secteurs' },
    },
  ],
};
