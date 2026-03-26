const config = require('../../utils/config');
const { notificationsServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour notifications-service
 */
const rewriteNotificationsPath = (path) => {
  if (path.startsWith('/api/notifications')) {
    return path;
  }

  if (path.startsWith('/notifications')) {
    return path.replace(/^\/notifications/, '/api/notifications');
  }

  return `/api${path}`;
};

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
