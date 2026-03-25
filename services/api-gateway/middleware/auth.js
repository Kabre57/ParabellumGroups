const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const { logWarn, logInfo } = require('../utils/logger');

const extractToken = (req) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : null;
  return bearerToken || queryToken || null;
};

const authenticateToken = (req, res, next) => {
  const token = extractToken(req);

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
      permissions: decoded.permissions || decoded.permissionsList || []
    };
    next();
  });
};

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
  optionalAuth
};
