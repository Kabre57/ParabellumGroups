const config = require('../../utils/config');
const { notificationsServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour notifications-service
 */
const rewriteNotificationsPath = (path) => path.replace(/^\/notifications/, '/api/notifications');

/**
 * Configuration des routes notifications-service
 */
module.exports = {
  serviceName: 'NOTIFICATIONS',
  basePath: config.SERVICES.NOTIFICATIONS,
  pathRewrite: rewriteNotificationsPath,
  limiter: notificationsServiceLimiter,
  
  routes: [
    {
      path: '/notifications',
      auth: true,
      permission: { GET: 'messages.read' },
    },
  ],
};
