module.exports = {
  serviceName: 'storage-service',
  basePath: 'http://minio:9000',
  routes: [
    {
      path: '/storage/*',
      method: 'use',
      auth: false,
      pathRewrite: {
        '^/api/storage': ''
      }
    }
  ]
};
