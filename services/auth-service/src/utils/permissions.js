const prisma = require('../config/database');
const { hasAnyFlag, normalizeFlags } = require('./userPermissionOverrides');

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

  if (user.role?.code === 'ADMIN') {
    return ['*'];
  }

  const effectivePermissions = new Map();

  if (user.role?.rolePermissions) {
    for (const rp of user.role.rolePermissions) {
      if (rp.permission?.name) {
        effectivePermissions.set(rp.permission.name, normalizeFlags(rp));
      }
    }
  }

  if (user.user_permissions) {
    for (const up of user.user_permissions) {
      if (up.permissions?.name) {
        effectivePermissions.set(
          up.permissions.name,
          normalizeFlags(up, {
            canView: 'can_view',
            canCreate: 'can_create',
            canEdit: 'can_edit',
            canDelete: 'can_delete',
            canApprove: 'can_approve',
          })
        );
      }
    }
  }

  return Array.from(effectivePermissions.entries())
    .filter(([, flags]) => hasAnyFlag(flags))
    .map(([name]) => name);
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
