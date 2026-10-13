// Attribution et retrait des permissions associées aux rôles.
const { prisma, notification } = require('./shared');

/**
 * Update role permission
 * PUT /api/permissions/roles/:role/:permissionId
 */
const updateRolePermission = async (req, res) => {
  try {
    // if workflow enforcement is enabled, tell client to use requests
    if (process.env.ENFORCE_PERMISSION_WORKFLOW === 'true') {
      return res.status(403).json({
        success: false,
        message: 'Direct updates are disabled; please submit a permission change request',
      });
    }

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

    // send notification to affected role members
    notification.notifyAdmins(`Role permission updated for role ${role} / permission ${permission.name}`);

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

    notification.notifyAdmins(`Role permission removed for role ${role} / permission ${permission.name}`);

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

module.exports = { updateRolePermission, deleteRolePermission };
