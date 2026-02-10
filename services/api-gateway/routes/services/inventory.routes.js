const config = require('../../utils/config');
const { inventoryServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour inventory-service
 */
const rewriteInventoryPath = (path) => path.replace(/^\/inventory/, '/api');

/**
 * Configuration des routes inventory-service
 */
module.exports = {
  serviceName: 'INVENTORY',
  basePath: config.SERVICES.INVENTORY,
  pathRewrite: rewriteInventoryPath,
  limiter: inventoryServiceLimiter,
  
  routes: [
    {
      path: '/inventory',
      auth: true,
    },
  ],
};
