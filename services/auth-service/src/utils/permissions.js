const prisma = require('../config/database');

const AUDIT_LEVEL_PERMISSION_MAP = {
  canViewAuditLogInfo: 'INFO',
  canViewAuditLogWarning: 'WARNING',
  canViewAuditLogCritical: 'CRITICAL',
  canViewAuditLogSecurity: 'SECURITY'
};

/**
 * Récupère les noms des permissions d'un utilisateur (rôle + user_permissions)
 * @param {number} userId
 * @returns {Promise<string[]>}
 */
async function getUserPermissionNames(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true }
          }
        }
      },
      user_permissions: {
        include: { permissions: true }
      }
    }
  });

  if (!user) return [];

  const names = new Set();

  if (user.role?.rolePermissions) {
    for (const rp of user.role.rolePermissions) {
      const hasAny = rp.canView || rp.canCreate || rp.canEdit || rp.canDelete || rp.canApprove;
      if (hasAny && rp.permission?.name) {
        names.add(rp.permission.name);
      }
    }
  }

  if (user.user_permissions) {
    for (const up of user.user_permissions) {
      const hasAny = up.can_view || up.can_create || up.can_edit || up.can_delete || up.can_approve;
      if (hasAny && up.permissions?.name) {
        names.add(up.permissions.name);
      }
    }
  }

  return Array.from(names);
}

/**
 * Retourne les niveaux d'AuditLog que l'utilisateur peut consulter
 * @param {number} userId
 * @param {string} [roleCode] - Code du rôle (ADMIN a toutes les permissions)
 * @returns {Promise<string[]>}
 */
async function getAuditLogAllowedLevels(userId, roleCode) {
  if (roleCode === 'ADMIN') {
    return ['INFO', 'WARNING', 'CRITICAL', 'SECURITY'];
  }

  const names = await getUserPermissionNames(userId);
  const levels = [];

  for (const [permName, level] of Object.entries(AUDIT_LEVEL_PERMISSION_MAP)) {
    if (names.includes(permName)) {
      levels.push(level);
    }
  }

  return levels;
}

module.exports = {
  getUserPermissionNames,
  getAuditLogAllowedLevels,
  AUDIT_LEVEL_PERMISSION_MAP
};
