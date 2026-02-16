const config = require('../../utils/config');
const { commercialServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour commercial-service
 */
const rewriteCommercialPath = (path) => path.replace(/^\/commercial/, '/api/prospects');

/**
 * Configuration des routes commercial-service
 */
module.exports = {
  serviceName: 'COMMERCIAL',
  basePath: config.SERVICES.COMMERCIAL,
  pathRewrite: rewriteCommercialPath,
  limiter: commercialServiceLimiter,
  
  routes: [
    {
      path: '/commercial',
      auth: true,
      permission: {
        GET: 'prospects.read',
        POST: 'prospects.create',
        PUT: 'prospects.update',
        PATCH: 'prospects.update',
        DELETE: 'prospects.delete'
      },
    },
  ],
};
