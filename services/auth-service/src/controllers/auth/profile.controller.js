// Lit et met à jour le profil de l’utilisateur connecté.
const { prisma, getUserPermissionNames } = require('./shared');

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // Get full user details
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        serviceId: true,
        isActive: true,
        lastLogin: true,
        preferences: true,
        permissions: true,
        avatarUrl: true,
        employeeNumber: true,
        phone: true,
        position: true,
        department: true,
        createdAt: true,
        updatedAt: true,
        enterpriseId: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        enterprise: {
          select: { id: true, name: true, logoUrl: true }
        }
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const permissionsList = await getUserPermissionNames(user.id);

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        permissionsList,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      errors: error.message,
    });
  }
};

/**
 * Update current authenticated user profile
 * PATCH /api/auth/profile
 */

const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const normalizeText = (value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const normalized = String(value).trim();
      return normalized || null;
    };

    const existingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updateData = {
      firstName: normalizeText(req.body.firstName),
      lastName: normalizeText(req.body.lastName),
      phone: normalizeText(req.body.phoneNumber),
      avatarUrl: normalizeText(req.body.avatar),
      position: normalizeText(req.body.position),
      department: normalizeText(req.body.department),
      preferences:
        req.body.preferences === undefined
          ? undefined
          : req.body.preferences === null
          ? null
          : JSON.stringify(req.body.preferences),
    };

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        serviceId: true,
        isActive: true,
        lastLogin: true,
        preferences: true,
        permissions: true,
        avatarUrl: true,
        employeeNumber: true,
        phone: true,
        position: true,
        department: true,
        createdAt: true,
        updatedAt: true,
        enterpriseId: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        enterprise: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: updatedUser.id,
        action: 'PROFILE_UPDATED',
        entityType: 'User',
        entityId: String(updatedUser.id),
        details: `Profile updated for ${updatedUser.email}`,
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    const permissionsList = await getUserPermissionNames(updatedUser.id);

    return res.status(200).json({
      success: true,
      data: {
        ...updatedUser,
        permissionsList,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating profile',
      errors: error.message,
    });
  }
};

/**
 * Revoke all tokens for the current user
 * POST /api/auth/revoke-all
 */

module.exports = { getCurrentUser, updateProfile };
