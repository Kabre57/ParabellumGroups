const config = require('../../utils/config');

module.exports = {
  serviceName: 'storage-service',
  basePath: 'http://minio:9000',
  pathRewrite: {
    '^/api/storage': ''
  },
  routes: [
    {
      path: '/storage/*',
      method: 'use',
      // No auth requirement for public image viewing
      auth: false
    }
  ]
};
