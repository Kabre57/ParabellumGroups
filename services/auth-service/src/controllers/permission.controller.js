const { validationResult } = require('express-validator');
const prisma = require('../config/database');

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
 * Create new permission
 * POST /api/permissions
 */
const createPermission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, description, category } = req.body;

    // Check if permission with same name exists
    const existingPermission = await prisma.permission.findUnique({
      where: { name },
    });

    if (existingPermission) {
      return res.status(409).json({
        success: false,
        message: 'Permission with this name already exists',
      });
    }

    // Create permission
    const permission = await prisma.permission.create({
      data: {
        name,
        description,
        category,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PERMISSION_CREATED',
        entityType: 'Permission',
        entityId: permission.id.toString(),
        details: `Permission ${permission.name} created`,
        newValue: JSON.stringify(permission),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: permission,
    });
  } catch (error) {
    console.error('Create permission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating permission',
      errors: error.message,
    });
  }
};

/**
 * Update permission
 * PUT /api/permissions/:id
 */
const updatePermission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, description, category } = req.body;

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPermission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found',
      });
    }

    // If name is being updated, check for duplicates
    if (name && name !== existingPermission.name) {
      const nameExists = await prisma.permission.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(409).json({
          success: false,
          message: 'Permission name already in use',
        });
      }
    }

    // Update permission
    const updatedPermission = await prisma.permission.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingPermission.name,
        description: description !== undefined ? description : existingPermission.description,
        category: category || existingPermission.category,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PERMISSION_UPDATED',
        entityType: 'Permission',
        entityId: id,
        details: `Permission ${updatedPermission.name} updated`,
        oldValue: JSON.stringify(existingPermission),
        newValue: JSON.stringify(updatedPermission),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedPermission,
    });
  } catch (error) {
    console.error('Update permission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating permission',
      errors: error.message,
    });
  }
};

/**
 * Delete permission
 * DELETE /api/permissions/:id
 */
const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { rolePermissions: true },
        },
      },
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found',
      });
    }

    // Check if permission is assigned to roles
    if (permission._count.rolePermissions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete permission assigned to roles',
        errors: {
          roleCount: permission._count.rolePermissions,
        },
      });
    }

    // Delete permission
    await prisma.permission.delete({
      where: { id: parseInt(id) },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PERMISSION_DELETED',
        entityType: 'Permission',
        entityId: id,
        details: `Permission ${permission.name} deleted`,
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Permission deleted successfully',
    });
  } catch (error) {
    console.error('Delete permission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting permission',
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

    let whereClause;
    if (isId) {
      whereClause = { roleId };  // ← Utiliser roleId, pas role
    } else {
      // Si c'est un code, trouver le rôle correspondant
      const roleRecord = await prisma.role.findUnique({
        where: { code: role }
      });
      if (!roleRecord) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      whereClause = { roleId: roleRecord.id };  // ← Utiliser roleId
    }

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

/**
 * Update role permission
 * PUT /api/permissions/roles/:role/:permissionId
 */
const updateRolePermission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { role, permissionId } = req.params;
    const { canView, canCreate, canEdit, canDelete, canApprove } = req.body;

    // Convertir role en roleId
    const roleIdNum = parseInt(role);
    let roleId;
    if (!isNaN(roleIdNum)) {
      roleId = roleIdNum;
    } else {
      const roleRecord = await prisma.role.findUnique({
        where: { code: role }
      });
      if (!roleRecord) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }
      roleId = roleRecord.id;
    }

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(permissionId) },
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found',
      });
    }

    // Upsert role permission
    const rolePermission = await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: parseInt(permissionId),
        },
      },
      update: {
        canView: canView !== undefined ? canView : undefined,
        canCreate: canCreate !== undefined ? canCreate : undefined,
        canEdit: canEdit !== undefined ? canEdit : undefined,
        canDelete: canDelete !== undefined ? canDelete : undefined,
        canApprove: canApprove !== undefined ? canApprove : undefined,
      },
      create: {
        roleId,
        permissionId: parseInt(permissionId),
        canView: canView || false,
        canCreate: canCreate || false,
        canEdit: canEdit || false,
        canDelete: canDelete || false,
        canApprove: canApprove || false,
      },
      include: {
        permission: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_PERMISSION_UPDATED',
        entityType: 'RolePermission',
        entityId: rolePermission.id.toString(),
        details: `Role ${role} permission for ${permission.name} updated`,
        newValue: JSON.stringify(rolePermission),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Role permission updated successfully',
      data: rolePermission,
    });
  } catch (error) {
    console.error('Update role permission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating role permission',
      errors: error.message,
    });
  }
};

/**
 * Delete role permission
 * DELETE /api/permissions/roles/:role/:permissionId
 */
const deleteRolePermission = async (req, res) => {
  try {
    const { role, permissionId } = req.params;

    // Convertir role en roleId
    const roleIdNum = parseInt(role);
    let roleId;
    if (!isNaN(roleIdNum)) {
      roleId = roleIdNum;
    } else {
      const roleRecord = await prisma.role.findUnique({
        where: { code: role }
      });
      if (!roleRecord) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }
      roleId = roleRecord.id;
    }

    // Check if role permission exists
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: parseInt(permissionId),
        },
      },
    });

    if (!rolePermission) {
      return res.status(404).json({
        success: false,
        message: 'Role permission not found',
      });
    }

    // Delete role permission
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: parseInt(permissionId),
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_PERMISSION_DELETED',
        entityType: 'RolePermission',
        entityId: rolePermission.id.toString(),
        details: `Role ${role} permission deleted`,
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Role permission deleted successfully',
    });
  } catch (error) {
    console.error('Delete role permission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting role permission',
      errors: error.message,
    });
  }
};

module.exports = {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  updateRolePermission,
  deleteRolePermission,
};
