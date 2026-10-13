// Gestion du catalogue des permissions.
const { validationResult, prisma, notification } = require('./shared');

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

module.exports = { createPermission, updatePermission, deletePermission };
