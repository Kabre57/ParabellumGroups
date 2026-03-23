const jwt = require('jsonwebtoken');

const normalizePermissions = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification manquant' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET non configuré' });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email || null,
      role: decoded.role || decoded.roleCode || null,
      serviceId: decoded.serviceId || null,
      serviceName: decoded.serviceName || null,
      permissions: normalizePermissions(decoded.permissions || decoded.permissionsList),
    };
    next();
  });
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès non autorisé pour ce rôle' });
  }
  next();
};

module.exports = { authenticateToken, authorizeRoles };
