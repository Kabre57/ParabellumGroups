const prisma = require('../config/database');

/**
 * Get user permissions
 * GET /api/users/:userId/permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Récupérer l'utilisateur avec ses permissions personnelles et de rôle
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

    // Récupérer les permissions du rôle
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: {
        permission: true
      }
    });

    // Combiner les permissions (priorité aux permissions utilisateur)
    const permissionsMap = new Map();

    // D'abord les permissions du rôle
    rolePermissions.forEach(rp => {
      permissionsMap.set(rp.permission.name, {
        ...rp.permission,
        source: 'role',
        granted: true
      });
    });

    // Ensuite les permissions utilisateur (peuvent surcharger)
    user.userPermissions.forEach(up => {
      permissionsMap.set(up.permission.name, {
        ...up.permission,
        source: 'user',
        granted: up.granted
      });
    });

    const permissions = Array.from(permissionsMap.values());

    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        permissions,
        stats: {
          total: permissions.length,
          fromRole: rolePermissions.length,
          fromUser: user.userPermissions.length
        }
      }
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
    const { permissions } = req.body; // Array of permission names

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ permissions doit être un tableau'
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer toutes les permissions valides
    const validPermissions = await prisma.permission.findMany({
      where: {
        name: { in: permissions }
      }
    });

    // Supprimer les anciennes permissions utilisateur
    await prisma.userPermission.deleteMany({
      where: { userId: parseInt(userId) }
    });

    // Créer les nouvelles permissions
    const userPermissions = await prisma.userPermission.createMany({
      data: validPermissions.map(p => ({
        userId: parseInt(userId),
        permissionId: p.id,
        granted: true
      }))
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_PERMISSIONS_UPDATED',
        entityType: 'UserPermission',
        entityId: userId,
        details: `Permissions mises à jour pour ${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify({ permissions }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Permissions mises à jour avec succès',
      data: {
        userId: parseInt(userId),
        permissionsCount: userPermissions.count
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
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    // Grouper par catégorie
    const categories = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = {
          name: perm.category,
          permissions: []
        };
      }
      acc[perm.category].permissions.push(perm);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: Object.values(categories)
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
