const normalizePermissions = (permissions) => (Array.isArray(permissions) ? permissions.map(String) : []);

const isAdmin = (user) =>
  ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPERADMIN'].includes(
    String(user?.role || user?.roleCode || '').toUpperCase()
  );

const hasPermission = (user, permission) =>
  isAdmin(user) ||
  normalizePermissions(user?.permissions).some(
    (value) => value === '*' || value.toLowerCase() === permission.toLowerCase()
  );

const actorId = (req) => String(req.user?.userId || req.user?.id || '');

const actorName = (req) =>
  [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim() ||
  req.user?.email ||
  `Utilisateur ${actorId(req)}`;

const getToken = (req) => req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || '';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

module.exports = {
  normalizePermissions,
  isAdmin,
  hasPermission,
  actorId,
  actorName,
  getToken,
  fail,
};
