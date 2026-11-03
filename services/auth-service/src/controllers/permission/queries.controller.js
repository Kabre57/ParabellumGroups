// Consultation des permissions, modules et droits par rôle.
const { prisma, getPermissionModules } = require('./shared');
const { findRoleInScope, findRoleByCodeInScope } = require('../../utils/roleScope');

/**
 * Get all permissions
 * GET /api/permissions
 */
const getAllPermissions = async (req, res) => {
  try {
    const { category } = req.query;

    const where = category ? { category } : {};

    const permissions = await prisma.permission.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Get all permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching permissions',
      errors: error.message,
    });
  }
};

/**
 * Get the modular permission registry
 * GET /api/permissions/modules
 */
const getPermissionModuleRegistry = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: getPermissionModules(),
    });
  } catch (error) {
    console.error('Get permission modules error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching permission modules',
      errors: error.message,
    });
  }
};

/**
 * Get permission by ID
 * GET /api/permissions/:id
 */
const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: permission,
    });
  } catch (error) {
    console.error('Get permission by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching permission',
      errors: error.message,
    });
  }
};

/**
 * Get role permissions
 * GET /api/permissions/roles/:role
 */
const getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;

    // Convertir en nombre si c'est un ID
    const roleId = parseInt(role);
    const isId = !isNaN(roleId);

    const roleRecord = isId
      ? await findRoleInScope(prisma, req, roleId)
      : await findRoleByCodeInScope(prisma, req, role);
    if (!roleRecord) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    const whereClause = { roleId: roleRecord.id };

    const rolePermissions = await prisma.rolePermission.findMany({
      where: whereClause,
      include: {
        permission: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: rolePermissions,
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching role permissions',
      errors: error.message,
    });
  }
};

module.exports = { getAllPermissions, getPermissionModuleRegistry, getPermissionById, getRolePermissions };
