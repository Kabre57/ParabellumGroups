const { validationResult } = require('express-validator');
const prisma = require('../config/database');

/**
 * Get all roles
 * GET /api/roles
 */
const getAllRoles = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Get all roles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching roles',
      errors: error.message,
    });
  }
};

/**
 * Get role by ID
 * GET /api/roles/:id
 */
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching role',
      errors: error.message,
    });
  }
};

/**
 * Create new role
 * POST /api/roles
 */
const createRole = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, code, description, isActive } = req.body;

    // Check if role with same name exists
    const existingName = await prisma.role.findUnique({
      where: { name },
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: 'Role with this name already exists',
      });
    }

    // Check if role with same code exists
    const existingCode = await prisma.role.findUnique({
      where: { code },
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: 'Role with this code already exists',
      });
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name,
        code,
        description,
        isActive: isActive !== undefined ? isActive : true,
        isSystem: false,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_CREATED',
        entityType: 'Role',
        entityId: role.id.toString(),
        details: `Role ${role.name} created`,
        newValue: JSON.stringify(role),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role,
    });
  } catch (error) {
    console.error('Create role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating role',
      errors: error.message,
    });
  }
};

/**
 * Update role
 * PUT /api/roles/:id
 */
const updateRole = async (req, res) => {
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
    const { name, code, description, isActive } = req.body;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Prevent modification of system roles
    if (existingRole.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify system roles',
      });
    }

    // If name is being updated, check for duplicates
    if (name && name !== existingRole.name) {
      const nameExists = await prisma.role.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(409).json({
          success: false,
          message: 'Role name already in use',
        });
      }
    }

    // If code is being updated, check for duplicates
    if (code && code !== existingRole.code) {
      const codeExists = await prisma.role.findUnique({
        where: { code },
      });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: 'Role code already in use',
        });
      }
    }

    // Update role
    const updatedRole = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingRole.name,
        code: code || existingRole.code,
        description: description !== undefined ? description : existingRole.description,
        isActive: isActive !== undefined ? isActive : existingRole.isActive,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_UPDATED',
        entityType: 'Role',
        entityId: id,
        details: `Role ${updatedRole.name} updated`,
        oldValue: JSON.stringify(existingRole),
        newValue: JSON.stringify(updatedRole),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole,
    });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating role',
      errors: error.message,
    });
  }
};

/**
 * Delete role
 * DELETE /api/roles/:id
 */
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system roles',
      });
    }

    // Check if role has users
    if (role._count.users > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role with assigned users',
        errors: {
          userCount: role._count.users,
        },
      });
    }

    // Delete role (will cascade delete rolePermissions)
    await prisma.role.delete({
      where: { id: parseInt(id) },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_DELETED',
        entityType: 'Role',
        entityId: id,
        details: `Role ${role.name} deleted`,
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Delete role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting role',
      errors: error.message,
    });
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
