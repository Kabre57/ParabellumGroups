const prisma = require('../config/database');

/**
 * Get user permissions
 * GET /api/users/:userId/permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

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
        if (existing && existing.source === 'role') {
          // Fusionner : les permissions utilisateur écrasent celles du rôle
          permissionsMap.set(up.permission_id, {
            ...existing,
            source: 'mixed',
            canView: up.can_view !== undefined ? up.can_view : existing.canView,
            canCreate: up.can_create !== undefined ? up.can_create : existing.canCreate,
            canEdit: up.can_edit !== undefined ? up.can_edit : existing.canEdit,
            canDelete: up.can_delete !== undefined ? up.can_delete : existing.canDelete,
            canApprove: up.can_approve !== undefined ? up.can_approve : existing.canApprove
          });
        } else {
          permissionsMap.set(up.permission_id, {
            id: up.id,
            permissionId: up.permission_id,
            permission: up.permissions,  // Changed from 'permission' to 'permissions'
            source: 'user',
            canView: up.can_view,
            canCreate: up.can_create,
            canEdit: up.can_edit,
            canDelete: up.can_delete,
            canApprove: up.can_approve
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
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Supprimer toutes les permissions existantes
    await prisma.userPermission.deleteMany({
      where: { userId: parseInt(userId) }
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
      const permission = await prisma.permission.findUnique({
        where: { id: parseInt(permissionId) }
      });

      if (!permission) {
        console.warn(`Permission ID ${permissionId} non trouvée, ignorée`);
        continue;
      }

      const userPerm = await prisma.userPermission.create({
        data: {
          user_id: parseInt(userId),
          permission_id: parseInt(permissionId),
          can_view: canView,
          can_create: canCreate,
          can_edit: canEdit,
          can_delete: canDelete,
          can_approve: canApprove,
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
        userPermissions: {
          include: {
            permission: true
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

    // Vérifier permission utilisateur
    const userPerm = user.userPermissions.find(
      up => up.permission.name === permissionName
    );

    if (userPerm) {
      source = 'user';
      switch (action) {
        case 'view':
          hasPermission = userPerm.canView;
          break;
        case 'create':
          hasPermission = userPerm.canCreate;
          break;
        case 'edit':
          hasPermission = userPerm.canEdit;
          break;
        case 'delete':
          hasPermission = userPerm.canDelete;
          break;
        case 'approve':
          hasPermission = userPerm.canApprove;
          break;
        default:
          hasPermission = userPerm.canView || userPerm.canCreate || userPerm.canEdit || userPerm.canDelete || userPerm.canApprove;
      }
    } else if (user.roleId) {
      // Vérifier permission du rôle
      const rolePerm = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: user.roleId,
            permissionId: permission.id
          }
        }
      });

      if (rolePerm) {
        source = 'role';
        switch (action) {
          case 'view':
            hasPermission = rolePerm.canView;
            break;
          case 'create':
            hasPermission = rolePerm.canCreate;
            break;
          case 'edit':
            hasPermission = rolePerm.canEdit;
            break;
          case 'delete':
            hasPermission = rolePerm.canDelete;
            break;
          case 'approve':
            hasPermission = rolePerm.canApprove;
            break;
          default:
            hasPermission = rolePerm.canView || rolePerm.canCreate || rolePerm.canEdit || rolePerm.canDelete || rolePerm.canApprove;
        }
      }
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
  getUserPermissions,
  updateUserPermissions,
  checkUserPermission,
  getPermissionCategories
};