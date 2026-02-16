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
  if (path.startsWith('/api/auth/users') || path.startsWith('/auth/users')) {
    return path.replace(/^\/?api?\/auth\/users/, '/api/users');
  }
  if (path.startsWith('/api/auth/roles') || path.startsWith('/auth/roles')) {
    return path.replace(/^\/?api?\/auth\/roles/, '/api/roles');
  }
  if (path.startsWith('/api/auth/services') || path.startsWith('/auth/services')) {
    return path.replace(/^\/?api?\/auth\/services/, '/api/services');
  }
  if (path.startsWith('/api/auth/permissions') || path.startsWith('/auth/permissions')) {
    return path.replace(/^\/?api?\/auth\/permissions/, '/api/permissions');
  }
  return path.replace(/^\/?api?\/auth/, '/api/auth');
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
  ],
};
