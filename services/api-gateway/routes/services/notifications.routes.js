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
      path: '/notifications/stream',
      auth: true,
      permission: { GET: ['notifications.read', 'notifications.read_own'] },
    },
    {
      path: '/notifications/mark-all-read',
      auth: true,
      permission: { PATCH: ['notifications.read', 'notifications.read_own'] },
    },
    {
      path: '/notifications',
      auth: true,
      permission: {
        GET: ['notifications.read', 'notifications.read_own'],
        PATCH: ['notifications.read', 'notifications.read_own'],
      },
    },
  ],
};
