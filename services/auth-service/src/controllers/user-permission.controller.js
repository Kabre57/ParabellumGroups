const prisma = require('../config/database');

/**
 * Get user permissions
 * GET /api/users/:userId/permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

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
        message: 'Utilisateur non trouve'
      });
    }

    let rolePermissions = [];
    if (user.roleId) {
      rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: user.roleId },
        include: {
          permission: true
        }
      });
    }

    const permissionsMap = new Map();

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

    user.userPermissions.forEach(up => {
      permissionsMap.set(up.permissionId, {
        id: up.id,
        permissionId: up.permissionId,
        permission: up.permission,
        source: 'user',
        canView: up.canView,
        canCreate: up.canCreate,
        canEdit: up.canEdit,
        canDelete: up.canDelete,
        canApprove: up.canApprove
      });
    });

    const permissions = Array.from(permissionsMap.values());

    return res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la recuperation des permissions',
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
    const { permissions, permissionIds } = req.body;

    const hasPermissions = Array.isArray(permissions);
    const hasPermissionIds = Array.isArray(permissionIds);

    if (!hasPermissions && !hasPermissionIds) {
      return res.status(400).json({
        success: false,
        message: 'Le champ permissions ou permissionIds doit etre un tableau'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouve'
      });
    }

    let validPermissions;
    if (hasPermissionIds) {
      validPermissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds.map(id => parseInt(id)) }
        }
      });
    } else {
      validPermissions = await prisma.permission.findMany({
        where: {
          name: { in: permissions }
        }
      });
    }

    await prisma.userPermission.deleteMany({
      where: { userId: parseInt(userId) }
    });

    const userPermissions = await prisma.userPermission.createMany({
      data: validPermissions.map(p => ({
        userId: parseInt(userId),
        permissionId: p.id,
        granted: true
      }))
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_PERMISSIONS_UPDATED',
        entityType: 'UserPermission',
        entityId: userId,
        details: `Permissions mises a jour pour ${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify({ permissionIds: validPermissions.map(p => p.id) }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Permissions mises a jour avec succes',
      data: {
        userId: parseInt(userId),
        permissionsCount: userPermissions.count
      }
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise a jour des permissions',
      errors: error.message
    });
  }
};

/**
 * Check if user has permission
 * GET /api/users/:userId/permissions/check/:permissionName
 */
const checkUserPermission = async (req, res) => {
  try {
    const { userId, permissionName } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        userPermissions: {
          include: {
            permission: true
          }
        }
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

    // Vérifier permission utilisateur
    const userPerm = user.userPermissions.find(
      up => up.permission.name === permissionName
    );

    if (userPerm) {
      return res.status(200).json({
        success: true,
        data: {
          hasPermission: userPerm.granted,
          source: 'user'
        }
      });
    }

    // Vérifier permission du rôle
    const rolePerm = await prisma.rolePermission.findUnique({
      where: {
        role_permissionId: {
          role: user.role,
          permissionId: permission.id
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        hasPermission: !!rolePerm,
        source: rolePerm ? 'role' : 'none'
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
      message: 'Erreur lors de la recuperation des categories',
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
