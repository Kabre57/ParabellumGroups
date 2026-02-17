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
      permissionByPath: [
        {
          pattern: /^\/campagnes(\/|$)/,
          permissions: {
            GET: 'emails.read',
            POST: 'emails.send_bulk',
            PUT: 'emails.send_bulk',
            PATCH: 'emails.send_bulk',
            DELETE: 'emails.send_bulk'
          }
        },
        {
          pattern: /^\/templates(\/|$)/,
          permissions: {
            GET: 'emails.manage_templates',
            POST: 'emails.manage_templates',
            PUT: 'emails.manage_templates',
            PATCH: 'emails.manage_templates',
            DELETE: 'emails.manage_templates'
          }
        }
      ],
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
