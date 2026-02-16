const { logWarn } = require('../utils/logger');

const normalizePermissions = (permissions) => {
  if (!permissions) return new Set();
  const list = Array.isArray(permissions) ? permissions : [permissions];
  return new Set(list.map(p => String(p).toLowerCase()));
};

const getPermissionAliases = (permission) => {
  if (!permission) return [];
  const normalized = String(permission).toLowerCase();
  const aliases = new Set();

  aliases.add(normalized);

  if (normalized.endsWith('.read')) {
    aliases.add(normalized.replace(/\.read$/, '.view'));
    aliases.add(normalized.replace(/\.read$/, '.view_all'));
    aliases.add(normalized.replace(/\.read$/, '.view_assigned'));
    aliases.add(normalized.replace(/\.read$/, '.read_all'));
    aliases.add(normalized.replace(/\.read$/, '.read_assigned'));
  }

  if (normalized.endsWith('.view')) {
    aliases.add(normalized.replace(/\.view$/, '.read'));
  }

  if (normalized.endsWith('.read_all')) {
    aliases.add(normalized.replace(/\.read_all$/, '.read'));
  }

  if (normalized.endsWith('.read_assigned')) {
    aliases.add(normalized.replace(/\.read_assigned$/, '.read'));
  }

  if (normalized === 'messages.read') {
    aliases.add('messages.view');
  }

  if (normalized === 'inventory.read') {
    aliases.add('inventory.view');
    aliases.add('inventory.view_all');
    aliases.add('inventory.view_warehouse');
  }

  return Array.from(aliases);
};

const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role || user.roleCode || '';
  const roleValue = String(role).toUpperCase();
  return roleValue === 'ADMIN' || roleValue === 'ADMINISTRATOR' || roleValue === 'ADMINISTRATEUR';
};

const requireAdmin = () => (req, res, next) => {
  if (isAdminUser(req.user)) return next();

  logWarn('Forbidden: admin-only route', {
    path: req.path,
    userId: req.user?.id
  });

  return res.status(403).json({
    success: false,
    message: 'Accès refusé',
    requiredPermission: 'admin'
  });
};

const requirePermission = (permissionOrMap) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Non authentifié'
    });
  }

  if (isAdminUser(req.user)) return next();

  let requiredPermission = null;
  if (typeof permissionOrMap === 'string') {
    requiredPermission = permissionOrMap;
  } else if (permissionOrMap && typeof permissionOrMap === 'object') {
    requiredPermission = permissionOrMap[req.method];
  }

  if (!requiredPermission) return next();

  const permissions = normalizePermissions(req.user.permissions);
  const requiredList = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  const requiredAliases = requiredList.flatMap(getPermissionAliases);
  if (requiredAliases.some((perm) => permissions.has(String(perm).toLowerCase()))) {
    return next();
  }

  logWarn('Forbidden: missing permission', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    requiredPermission: requiredList[0]
  });

  return res.status(403).json({
    success: false,
    message: 'Accès refusé',
    requiredPermission: requiredList[0]
  });
};

const requirePermissionByPath = (rules) => (req, res, next) => {
  if (!Array.isArray(rules) || rules.length === 0) return next();
  const path = req.path || '';

  for (const rule of rules) {
    if (rule?.pattern?.test(path)) {
      return requirePermission(rule.permissions)(req, res, next);
    }
  }

  return next();
};

module.exports = {
  requirePermission,
  requireAdmin,
  requirePermissionByPath
};
