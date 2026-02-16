const config = require('../../utils/config');
const { communicationServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour communication-service
 */
const rewriteCommunicationPath = (path) => path.replace(/^\/communication/, '/api');

/**
 * Configuration des routes communication-service
 */
module.exports = {
  serviceName: 'COMMUNICATION',
  basePath: config.SERVICES.COMMUNICATION,
  pathRewrite: rewriteCommunicationPath,
  limiter: communicationServiceLimiter,
  
  routes: [
    {
      path: '/communication',
      auth: true,
      permission: {
        GET: 'messages.read',
        POST: 'messages.send',
        PUT: 'messages.send',
        PATCH: 'messages.send',
        DELETE: 'messages.delete'
      },
    },
  ],
};
