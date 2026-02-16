const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requirePermission, requirePermissionByPath } = require('../middleware/permissions');
const { validateSchema } = require('../middleware/validation');
const { logError, logInfo } = require('../utils/logger');

const router = express.Router();

/**
 * Cree un middleware proxy avec configuration de base
 */
const createProxy = (target, pathRewriteConfig = {}) => {
  const proxyConfig = {
    target,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      if (req.user) {
        const userId = req.user.id || req.user.userId;
        if (userId) {
          proxyReq.setHeader('X-User-Id', userId.toString());
        }
        if (req.user.role) {
          proxyReq.setHeader('X-User-Role', req.user.role);
        }
        if (req.user.email) {
          proxyReq.setHeader('X-User-Email', req.user.email);
        }
      }
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
      }
    },
    onError: (err, req, res) => {
      logError(`Proxy error for ${req.path}`, err);
      res.status(500).json({
        success: false,
        message: 'Erreur de communication avec le service'
      });
    }
  };

  if (typeof pathRewriteConfig === 'function') {
    proxyConfig.pathRewrite = pathRewriteConfig;
  } else if (pathRewriteConfig && Object.keys(pathRewriteConfig).length > 0) {
    proxyConfig.pathRewrite = pathRewriteConfig;
  }

  return createProxyMiddleware(proxyConfig);
};

/**
 * Charge automatiquement toutes les configurations de services
 */
const loadServiceRoutes = () => {
  const fs = require('fs');
  const path = require('path');
  const servicesDir = path.join(__dirname, 'services');

  const serviceConfigs = [];

  try {
    const files = fs.readdirSync(servicesDir);

    files.forEach(file => {
      if (file.endsWith('.routes.js')) {
        const config = require(path.join(servicesDir, file));
        serviceConfigs.push(config);
      }
    });
  } catch (error) {
    logError('Error loading service routes', error);
  }

  return serviceConfigs;
};

/**
 * Enregistre les routes d'un service
 */
const registerServiceRoutes = (serviceConfig) => {
  const { serviceName, basePath, pathRewrite, limiter, routes } = serviceConfig;

  if (!Array.isArray(routes) || routes.length === 0) {
    logInfo(`No routes configured for ${serviceName}`);
    return;
  }

  routes.forEach(route => {
    const middlewares = [];

    const routeLimiter = route.limiter || limiter;
    if (routeLimiter) {
      middlewares.push(routeLimiter);
    }

    if (route.validation) {
      middlewares.push(validateSchema(route.validation));
    }

    if (route.auth) {
      middlewares.push(authenticateToken);
    }

    if (route.admin) {
      middlewares.push(requireAdmin());
    }

    if (route.permissionByPath) {
      middlewares.push(requirePermissionByPath(route.permissionByPath));
    }

    if (route.permission) {
      middlewares.push(requirePermission(route.permission));
    }

    const routePathRewrite = route.pathRewrite || pathRewrite;
    middlewares.push(createProxy(basePath, routePathRewrite));

    if (route.method) {
      router[route.method](route.path, ...middlewares);
    } else {
      router.use(route.path, ...middlewares);
    }
  });
};

/**
 * Initialisation des routes
 */
const initializeRoutes = () => {
  const serviceConfigs = loadServiceRoutes();

  serviceConfigs.forEach(config => {
    registerServiceRoutes(config);
  });
};

initializeRoutes();

module.exports = router;
