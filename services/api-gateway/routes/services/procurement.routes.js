const config = require('../../utils/config');
const { procurementServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour procurement-service
 */
const rewriteProcurementPath = (path) => {
  if (path.startsWith('/procurement/fournisseurs')) {
    return path.replace('/procurement/fournisseurs', '/api/fournisseurs');
  }
  if (path.startsWith('/procurement/bons-commande')) {
    return path.replace('/procurement/bons-commande', '/api/bons-commande');
  }
  if (path.startsWith('/procurement/demandes-achat')) {
    return path.replace('/procurement/demandes-achat', '/api/demandes-achat');
  }
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

/**
 * Configuration des routes procurement-service
 */
module.exports = {
  serviceName: 'PROCUREMENT',
  basePath: config.SERVICES.PROCUREMENT,
  pathRewrite: rewriteProcurementPath,
  limiter: procurementServiceLimiter,
  
  routes: [
    {
      path: '/procurement',
      auth: true,
      permission: {
        GET: 'purchases.read',
        POST: 'purchases.create',
        PUT: 'purchases.update',
        PATCH: 'purchases.update',
        DELETE: 'purchases.delete'
      },
    },
  ],
};
