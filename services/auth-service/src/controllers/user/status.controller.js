// Activation et désactivation des comptes utilisateurs.
const { validationResult, prisma } = require('./shared');
const { isServiceManager, ensureManagedTarget } = require('../../utils/serviceManagerScope');

/**
 * Update user status (activate/deactivate)
 * PATCH /api/users/:id/status
 */
const updateUserStatus = async (req, res) => {
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
    const { isActive } = req.body;

    const whereClause = { id: parseInt(id) };
    if (isServiceManager(req.user)) {
      const target = await ensureManagedTarget(req.user, id);
      if (!target) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable dans votre service.' });
      }
      whereClause.serviceId = target.serviceId;
    }
    if (req.user.enterpriseId) {
      whereClause.enterpriseId = req.user.enterpriseId;
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deactivating yourself
    if (req.user.id === parseInt(id) && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account',
      });
    }

    // Update status
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_STATUS_UPDATED',
        entityType: 'User',
        entityId: id,
        details: `User ${updatedUser.email} status changed to ${isActive ? 'active' : 'inactive'}`,
        newValue: JSON.stringify({ isActive }),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating user status',
      errors: error.message,
    });
  }
};

module.exports = { updateUserStatus };
