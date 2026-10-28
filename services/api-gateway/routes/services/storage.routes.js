const config = require('../../utils/config');

module.exports = {
  serviceName: 'AUTH_STORAGE',
  basePath: config.SERVICES.AUTH,
  routes: [
    {
      path: '/storage/*',
      method: 'use',
      auth: true,
      authCookie: 'storage',
      pathRewrite: {
        '^/storage': '/api/storage'
      }
    }
  ]
};
