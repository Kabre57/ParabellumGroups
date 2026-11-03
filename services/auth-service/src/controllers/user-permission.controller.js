const prisma = require('../config/database');
const {
  hasAnyFlag,
  normalizeFlags,
  applyUserOverride,
  computeMeaningfulOverride,
} = require('../utils/userPermissionOverrides');
const {
  isServiceManager,
  ensureManagedTarget,
  getManagedServices,
} = require('../utils/serviceManagerScope');

const DELEGATION_BLOCKED_PREFIXES = new Set([
  'admin', 'users', 'roles', 'permissions', 'enterprises', 'services',
  'audit_logs', 'system_settings', 'backups', 'logs', 'integrations',
]);
const DELEGATION_BLOCKED_PERMISSION_NAMES = new Set([
  'operational_requests.finance',
  'operational_requests.manage_types',
]);

const canDelegatePermission = (permissionName) => {
  const prefix = String(permissionName || '').split('.')[0].toLowerCase();
  return Boolean(permissionName) &&
    permissionName !== '*' &&
    !DELEGATION_BLOCKED_PREFIXES.has(prefix) &&
    !DELEGATION_BLOCKED_PERMISSION_NAMES.has(permissionName);
};

const getEffectivePermissionFlags = async (userId, client = prisma) => {
  const user = await client.user.findUnique({
    where: { id: Number(userId) },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
      user_permissions: { include: { permissions: true } },
    },
  });
  if (!user) return new Map();

  const flagsById = new Map();
  for (const rolePermission of user.role?.rolePermissions || []) {
    flagsById.set(rolePermission.permissionId, normalizeFlags(rolePermission));
  }
  for (const userPermission of user.user_permissions || []) {
    flagsById.set(
      userPermission.permission_id,
      normalizeFlags(userPermission, {
        canView: 'can_view',
        canCreate: 'can_create',
        canEdit: 'can_edit',
        canDelete: 'can_delete',
        canApprove: 'can_approve',
      }),
    );
  }
  return flagsById;
};

const getDelegablePermissions = async (req, res) => {
  try {
    if (!isServiceManager(req.user) || (await getManagedServices(req.user)).length === 0) {
      return res.status(403).json({ success: false, message: 'Vous ne gérez aucun service actif.' });
    }

    const flagsById = await getEffectivePermissionFlags(req.user.id);
    const allowedIds = Array.from(flagsById.keys());
    const permissions = await prisma.permission.findMany({
      where: { id: { in: allowedIds } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return res.status(200).json({
      success: true,
      data: permissions
        .filter((permission) => canDelegatePermission(permission.name) && hasAnyFlag(flagsById.get(permission.id)))
        .map((permission) => ({ ...permission, ...flagsById.get(permission.id) })),
    });
  } catch (error) {
    console.error('Get delegable permissions error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors du chargement des accès transmissibles.' });
  }
};

/**
 * Get user permissions
 * GET /api/users/:userId/permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (isServiceManager(req.user) && !(await ensureManagedTarget(req.user, userId))) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable dans votre service.' });
    }

    // Récupérer l'utilisateur avec ses permissions et son rôle
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        user_permissions: {
          include: {
            permissions: true  // Changed from 'permission' to 'permissions'
          }
        },
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer les permissions du rôle
    let rolePermissions = [];
    if (user.roleId) {
      rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: user.roleId },
        include: {
          permission: true
        }
      });
    }

    // Fusionner permissions utilisateur et rôle
    const permissionsMap = new Map();

    // Ajouter permissions du rôle
    rolePermissions.forEach(rp => {
      permissionsMap.set(rp.permissionId, {
        id: rp.id,
        permissionId: rp.permissionId,
        permission: rp.permission,
        source: 'role',
        canView: rp.canView,
        canCreate: rp.canCreate,
        canEdit: rp.canEdit,
        canDelete: rp.canDelete,
        canApprove: rp.canApprove
      });
    });

    // Ajouter/surcharger avec permissions utilisateur
    if (user.user_permissions) {
      user.user_permissions.forEach(up => {
        const existing = permissionsMap.get(up.permission_id);
        const userFlags = normalizeFlags(up, {
          canView: 'can_view',
          canCreate: 'can_create',
          canEdit: 'can_edit',
          canDelete: 'can_delete',
          canApprove: 'can_approve',
        });

        if (existing && existing.source === 'role') {
          const effectiveFlags = applyUserOverride({
            roleFlags: normalizeFlags(existing),
            userFlags,
          });

          permissionsMap.set(up.permission_id, {
            ...existing,
            overrideId: up.id,
            source: hasAnyFlag(effectiveFlags) ? 'mixed' : 'revoked',
            isRevoked: !hasAnyFlag(effectiveFlags),
            ...effectiveFlags,
          });
        } else {
          permissionsMap.set(up.permission_id, {
            id: up.id,
            permissionId: up.permission_id,
            permission: up.permissions,  // Changed from 'permission' to 'permissions'
            source: hasAnyFlag(userFlags) ? 'user' : 'revoked',
            isRevoked: !hasAnyFlag(userFlags),
            ...userFlags
          });
        }
      });
    }

    const permissions = Array.from(permissionsMap.values());

    return res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des permissions',
      errors: error.message
    });
  }
};

/**
 * Update user permissions
 * PUT /api/users/:userId/permissions
 */
const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    let { permissions, permissionIds } = req.body;

    if (isServiceManager(req.user)) {
      const target = await ensureManagedTarget(req.user, userId);
      if (!target) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable dans votre service.' });
      }
      if (permissionIds !== undefined || !Array.isArray(permissions)) {
        return res.status(400).json({ success: false, message: 'Envoyez une liste de permissions avec leurs droits détaillés.' });
      }
      if (!permissions.every((permission) =>
        permission &&
        typeof permission === 'object' &&
        !Array.isArray(permission) &&
        Number.isInteger(Number(permission.permissionId)) &&
        Number(permission.permissionId) > 0
      )) {
        return res.status(400).json({ success: false, message: 'Chaque permission doit avoir un identifiant valide.' });
      }

      const managerFlags = await getEffectivePermissionFlags(req.user.id);
      const managerPermissionIds = Array.from(managerFlags.keys());
      const managerPermissions = await prisma.permission.findMany({
        where: { id: { in: managerPermissionIds } },
        select: { id: true, name: true },
      });
      const allowedFlags = new Map(
        managerPermissions
          .filter((permission) => canDelegatePermission(permission.name))
          .map((permission) => [permission.id, managerFlags.get(permission.id)]),
      );
      const currentTargetFlags = await getEffectivePermissionFlags(target.id);
      const submittedIds = permissions.map((permission) => Number(permission.permissionId));
      if (new Set(submittedIds).size !== submittedIds.length) {
        return res.status(400).json({ success: false, message: 'Une permission ne peut être envoyée qu’une seule fois.' });
      }

      for (const permission of permissions) {
        const permissionId = Number(permission.permissionId);
        const maximum = allowedFlags.get(permissionId);
        if (!maximum) {
          return res.status(403).json({ success: false, message: 'Vous ne pouvez pas transmettre cette permission.' });
        }
        for (const flag of ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove']) {
          if (permission[flag] !== undefined && typeof permission[flag] !== 'boolean') {
            return res.status(400).json({ success: false, message: `Le droit ${flag} doit être booléen.` });
          }
          if (permission[flag] === true && !maximum[flag] && !currentTargetFlags.get(permissionId)?.[flag]) {
            return res.status(403).json({ success: false, message: 'Vous ne pouvez pas transmettre un droit que vous ne possédez pas.' });
          }
        }
      }

      const targetRolePermissions = target.roleId
        ? await prisma.rolePermission.findMany({ where: { roleId: target.roleId } })
        : [];
      const targetRoleFlags = new Map(targetRolePermissions.map((permission) => [permission.permissionId, normalizeFlags(permission)]));
      const changedPermissions = [];

      await prisma.$transaction(async (tx) => {
        for (const permission of permissions) {
          const permissionId = Number(permission.permissionId);
          const userFlags = normalizeFlags(permission);
          const override = computeMeaningfulOverride({
            roleFlags: targetRoleFlags.get(permissionId) || null,
            userFlags,
          });
          const existing = await tx.userPermission.findFirst({
            where: { user_id: Number(userId), permission_id: permissionId },
            select: { id: true },
          });

          if (!override) {
            if (existing) await tx.userPermission.delete({ where: { id: existing.id } });
          } else if (existing) {
            await tx.userPermission.update({
              where: { id: existing.id },
              data: {
                can_view: override.canView,
                can_create: override.canCreate,
                can_edit: override.canEdit,
                can_delete: override.canDelete,
                can_approve: override.canApprove,
                updated_at: new Date(),
              },
            });
          } else {
            await tx.userPermission.create({
              data: {
                user_id: Number(userId),
                permission_id: permissionId,
                can_view: override.canView,
                can_create: override.canCreate,
                can_edit: override.canEdit,
                can_delete: override.canDelete,
                can_approve: override.canApprove,
                updated_at: new Date(),
              },
            });
          }
          changedPermissions.push({ permissionId, ...userFlags });
        }

        if (changedPermissions.length) {
          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              action: 'SERVICE_MEMBER_PERMISSIONS_UPDATED',
              entityType: 'UserPermission',
              entityId: String(userId),
              details: `Accès mis à jour par le responsable de service pour ${target.firstName} ${target.lastName}`,
              newValue: JSON.stringify(changedPermissions),
              level: 'CRITICAL',
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            },
          });
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Accès du membre mis à jour.',
        data: { userId: Number(userId), updatedCount: changedPermissions.length },
      });
    }

    // Support des deux formats: permissionIds simple ou permissions détaillées
    if (permissionIds && Array.isArray(permissionIds)) {
      // Conversion de permissionIds en format complet avec toutes les actions à true
      permissions = permissionIds.map(id => ({
        permissionId: id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true
      }));
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ permissions ou permissionIds doit être un tableau'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        role: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role?.code === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Les permissions héritées du rôle Administrateur ne peuvent pas être modifiées'
      });
    }

    const rolePermissions = user.roleId
      ? await prisma.rolePermission.findMany({
          where: { roleId: user.roleId },
          include: { permission: true },
        })
      : [];

    const rolePermissionsByPermissionId = new Map(
      rolePermissions.map((permission) => [permission.permissionId, normalizeFlags(permission)])
    );

    const existingPermissions = await prisma.permission.findMany({
      where: {
        id: {
          in: permissions
            .map((permission) => Number(permission.permissionId))
            .filter((permissionId) => Number.isInteger(permissionId) && permissionId > 0),
        },
      },
    });

    const permissionsById = new Map(existingPermissions.map((permission) => [permission.id, permission]));

    // Supprimer toutes les permissions existantes
    await prisma.userPermission.deleteMany({
      where: { user_id: parseInt(userId) }
    });

    // Créer les nouvelles permissions
    const userPermissions = [];
    for (const perm of permissions) {
      const {
        permissionId,
        canView = false,
        canCreate = false,
        canEdit = false,
        canDelete = false,
        canApprove = false
      } = perm;
      
      // Vérifier si la permission existe
      const normalizedPermissionId = parseInt(permissionId);
      const permission = permissionsById.get(normalizedPermissionId);

      if (!permission) {
        console.warn(`Permission ID ${permissionId} non trouvée, ignorée`);
        continue;
      }

      const meaningfulOverride = computeMeaningfulOverride({
        roleFlags: rolePermissionsByPermissionId.get(normalizedPermissionId) || null,
        userFlags: { canView, canCreate, canEdit, canDelete, canApprove },
      });

      if (!meaningfulOverride) {
        continue;
      }

      const userPerm = await prisma.userPermission.create({
        data: {
          user_id: parseInt(userId),
          permission_id: normalizedPermissionId,
          can_view: meaningfulOverride.canView,
          can_create: meaningfulOverride.canCreate,
          can_edit: meaningfulOverride.canEdit,
          can_delete: meaningfulOverride.canDelete,
          can_approve: meaningfulOverride.canApprove,
          updated_at: new Date()
        }
      });

      userPermissions.push(userPerm);
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_PERMISSIONS_UPDATED',
        entityType: 'UserPermission',
        entityId: userId,
        details: `Permissions mises à jour pour ${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify(permissions.map(p => ({
          permissionId: p.permissionId,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          canApprove: p.canApprove
        }))),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Permissions mises à jour avec succès',
      data: {
        userId: parseInt(userId),
        permissionsCount: userPermissions.length
      }
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des permissions',
      errors: error.message
    });
  }
};

/**
 * Check if user has specific permission
 * GET /api/users/:userId/permissions/check
 */
const checkUserPermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionName, action } = req.query;

    if (!permissionName) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre permissionName est requis'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        user_permissions: {
          include: {
            permissions: true
          }
        },
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Chercher la permission
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName }
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée'
      });
    }

    let hasPermission = false;
    let source = 'none';

    const directUserPermissions = user.userPermissions || user.user_permissions || [];
    const userPerm = directUserPermissions.find(
      up => (up.permission?.name || up.permissions?.name) === permissionName
    );

    const rolePerm = user.roleId
      ? await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: user.roleId,
              permissionId: permission.id
            }
          }
        })
      : null;

    const readFlag = (perm, key) => {
      if (!perm) return false;
      switch (key) {
        case 'view':
          return Boolean(perm.canView);
        case 'create':
          return Boolean(perm.canCreate);
        case 'edit':
          return Boolean(perm.canEdit);
        case 'delete':
          return Boolean(perm.canDelete);
        case 'approve':
          return Boolean(perm.canApprove);
        default:
          return Boolean(perm.canView || perm.canCreate || perm.canEdit || perm.canDelete || perm.canApprove);
      }
    };

    const normalizedUserPerm = userPerm
      ? {
          canView: userPerm.canView ?? userPerm.can_view,
          canCreate: userPerm.canCreate ?? userPerm.can_create,
          canEdit: userPerm.canEdit ?? userPerm.can_edit,
          canDelete: userPerm.canDelete ?? userPerm.can_delete,
          canApprove: userPerm.canApprove ?? userPerm.can_approve,
        }
      : null;

    const normalizedRolePerm = rolePerm
      ? {
          canView: rolePerm.canView,
          canCreate: rolePerm.canCreate,
          canEdit: rolePerm.canEdit,
          canDelete: rolePerm.canDelete,
          canApprove: rolePerm.canApprove,
        }
      : null;

    if (normalizedUserPerm && normalizedRolePerm) {
      source = hasAnyFlag(normalizedUserPerm) ? 'mixed' : 'revoked';
      hasPermission = readFlag(normalizedUserPerm, action);
    } else if (normalizedUserPerm) {
      source = 'user';
      hasPermission = readFlag(normalizedUserPerm, action);
    } else if (normalizedRolePerm) {
      source = 'role';
      hasPermission = readFlag(normalizedRolePerm, action);
    }

    return res.status(200).json({
      success: true,
      data: {
        hasPermission,
        source,
        permissionName,
        action
      }
    });
  } catch (error) {
    console.error('Check user permission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de la permission',
      errors: error.message
    });
  }
};

/**
 * Get all categories
 * GET /api/permissions/categories
 */
const getPermissionCategories = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    const categories = permissions.map(p => p.category);

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get permission categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      errors: error.message
    });
  }
};

module.exports = {
  getDelegablePermissions,
  getUserPermissions,
  updateUserPermissions,
  checkUserPermission,
  getPermissionCategories
};
