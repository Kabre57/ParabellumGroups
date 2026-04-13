const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { authServiceLimiter } = require('../../middleware/serviceLimiters');
const { validateSchema, schemas } = require('../../middleware/validation');
const config = require('../../utils/config');

const router = express.Router();

/**
 * Path rewrite pour auth-service
 */
const rewriteAuthPath = (path) => {
  if (path.startsWith('/auth/users')) {
    return path.replace(/^\/auth\/users/, '/api/users');
  }
  if (path.startsWith('/auth/roles')) {
    return path.replace(/^\/auth\/roles/, '/api/roles');
  }
  if (path.startsWith('/auth/services')) {
    return path.replace(/^\/auth\/services/, '/api/services');
  }
  if (path.startsWith('/auth/permissions')) {
    return path.replace(/^\/auth\/permissions/, '/api/permissions');
  }
  if (path.startsWith('/auth/enterprises')) {
    return path.replace(/^\/auth\/enterprises/, '/api/enterprises');
  }
  if (path.startsWith('/auth/enterprises/logo')) {
    return path.replace(/^\/auth\/enterprises\/logo/, '/api/enterprises/logo');
  }
  return path.replace(/^\/auth/, '/api/auth');
};

/**
 * Configuration des routes auth-service
 */
module.exports = {
  serviceName: 'AUTH',
  basePath: config.SERVICES.AUTH,
  pathRewrite: rewriteAuthPath,
  limiter: authServiceLimiter,
  
  routes: [
    // Routes admin protégées
    {
      path: '/auth/users',
      auth: true,
      admin: true,
    },
    {
      path: '/auth/roles',
      auth: true,
      admin: true,
    },
    {
      path: '/auth/services',
      method: 'get',
      auth: true,
      permission: [
        'services.read_all',
        'purchases.create',
        'purchases.read',
        'purchases.read_own',
        'quotes.read',
        'quotes.read_own',
        'quotes.read_all',
      ],
    },
    {
      path: '/auth/services',
      auth: true,
      admin: true,
    },
    {
      path: '/auth/permissions',
      auth: true,
      admin: true,
    },
    
    // Routes publiques avec validation
    {
      path: '/auth/login',
      method: 'post',
      auth: false,
      validation: schemas.auth.login,
    },
    {
      path: '/auth/register',
      method: 'post',
      auth: false,
      validation: schemas.auth.register,
    },
    {
      path: '/auth/refresh',
      method: 'post',
      auth: false,
      validation: schemas.auth.refresh,
    },
    
    // Route catch-all auth
    {
      path: '/auth',
      auth: false,
    },
    
    // Routes directes admin
    {
      path: '/roles',
      auth: true,
      admin: true,
      pathRewrite: { '^/roles': '/api/roles' },
    },
    {
      path: '/users',
      auth: true,
      admin: true,
      pathRewrite: { '^/users': '/api/users' },
    },
    {
      path: '/services',
      method: 'get',
      auth: true,
      permission: [
        'services.read_all',
        'purchases.create',
        'purchases.read',
        'purchases.read_own',
        'quotes.read',
        'quotes.read_own',
        'quotes.read_all',
      ],
      pathRewrite: { '^/services': '/api/services' },
    },
    {
      path: '/services',
      auth: true,
      admin: true,
      pathRewrite: { '^/services': '/api/services' },
    },
    {
      path: '/permissions',
      auth: true,
      admin: true,
      pathRewrite: { '^/permissions': '/api/permissions' },
    },
    {
      path: '/permission-requests',
      auth: true,
      admin: true,
      pathRewrite: { '^/permission-requests': '/api/permission-requests' },
    },
    {
      path: '/audit-logs',
      auth: true,
      admin: true,
      pathRewrite: { '^/audit-logs': '/api/audit-logs' },
    },
    {
      path: '/auth/enterprises',
      auth: true,
      admin: true,
    },
    {
      path: '/enterprises',
      auth: true,
      admin: true,
      pathRewrite: { '^/enterprises': '/api/enterprises' },
    },
  ],
};
