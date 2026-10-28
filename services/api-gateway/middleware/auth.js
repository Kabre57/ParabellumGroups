const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const { logWarn, logInfo } = require('../utils/logger');

const getCookieToken = (req, name) => {
  const cookieHeader = req.headers.cookie || '';
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return null;
  }
};

const extractToken = (req, { storageCookie = false } = {}) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  if (storageCookie) {
    return bearerToken || getCookieToken(req, 'pbl_storage_token');
  }
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : null;
  return bearerToken || queryToken || null;
};

const createAuthMiddleware = (options = {}) => (req, res, next) => {
  const token = extractToken(req, options);

  if (!token) {
    logWarn('Authentication attempt without token', {
      path: req.path,
      ip: req.ip
    });
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification manquant'
    });
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      logWarn('Invalid token attempt', {
        path: req.path,
        ip: req.ip,
        error: err.message
      });
      return res.status(403).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    if (config.NODE_ENV === 'development') {
      logInfo('Token authenticated', {
        userId: decoded.userId,
        path: req.path
      });
    }
    
    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || decoded.roleCode,
      roleCode: decoded.roleCode,
      serviceId: decoded.serviceId,
      serviceName: decoded.serviceName || decoded.service?.name || null,
      enterpriseId: decoded.enterpriseId || null,
      permissions: decoded.permissions || decoded.permissionsList || []
    };
    next();
  });
};

const authenticateToken = (req, res, next) => createAuthMiddleware()(req, res, next);

const authenticateStorageToken = (req, res, next) =>
  createAuthMiddleware({ storageCookie: true })(req, res, next);

const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (!err) {
      // Normalize user object: ensure 'id' property exists
      req.user = {
        id: decoded.userId || decoded.id,
        userId: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role || decoded.roleCode,
        roleCode: decoded.roleCode,
        serviceId: decoded.serviceId,
        serviceName: decoded.serviceName || decoded.service?.name || null,
        permissions: decoded.permissions || decoded.permissionsList || []
      };
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  authenticateStorageToken,
  optionalAuth
};
