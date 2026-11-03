// Création, modification et suppression des comptes.
const { validationResult, prisma, hashPassword } = require('./shared');
const { DEFAULT_INITIAL_PASSWORD } = require('../../utils/password');
const {
  isServiceManager,
  getManagedServices,
  ensureManagedTarget,
} = require('../../utils/serviceManagerScope');

/**
 * Create new user
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password, firstName, lastName, roleId, serviceId, enterpriseId, isActive, phone, position } = req.body;
    const managedServices = isServiceManager(req.user) ? await getManagedServices(req.user) : [];
    const managedServiceId = serviceId ? parseInt(serviceId, 10) : (managedServices.length === 1 ? managedServices[0].id : null);
    const managedService = managedServices.find((service) => service.id === managedServiceId);

    if (isServiceManager(req.user) && !managedService) {
      return res.status(403).json({
        success: false,
        message: 'Choisissez un service que vous gérez.',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Get default EMPLOYEE role if no roleId provided
    let finalRoleId = isServiceManager(req.user) ? null : roleId;
    if (!finalRoleId) {
      const employeeRole = await prisma.role.findUnique({
        where: { code: isServiceManager(req.user) ? 'SERVICE_MEMBER' : 'EMPLOYEE' },
      });
      finalRoleId = employeeRole?.id || null;
    }

    if (!finalRoleId) {
      return res.status(500).json({ success: false, message: 'Le rôle de base requis est indisponible.' });
    }

    // Hash password
    const passwordHash = await hashPassword(isServiceManager(req.user) ? DEFAULT_INITIAL_PASSWORD : password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: finalRoleId,
        serviceId: isServiceManager(req.user) ? managedService.id : (serviceId ? parseInt(serviceId) : null),
        enterpriseId: isServiceManager(req.user)
          ? managedService.enterpriseId
          : (req.user.enterpriseId || (enterpriseId ? parseInt(enterpriseId) : null)),
        isActive: isServiceManager(req.user) ? true : (isActive !== undefined ? isActive : true),
        phone: phone || null,
        position: position || null,
        mustChangePassword: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        serviceId: true,
        enterpriseId: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id.toString(),
        details: `User ${user.email} created`,
        newValue: JSON.stringify({ ...user, passwordHash: '[REDACTED]' }),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating user',
      errors: error.message,
    });
  }
};

/**
 * Update user
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
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
    const updateData = { ...req.body };

    // Handle password update separately
    const newPassword = updateData.password;
    delete updateData.password;

    // Remove fields that shouldn't be updated this way
    delete updateData.id;
    delete updateData.passwordHash;
    delete updateData.createdAt;

    if (updateData.roleId !== undefined && updateData.roleId !== null) {
      updateData.roleId = parseInt(updateData.roleId);
    }

    if (updateData.serviceId === '') {
      updateData.serviceId = null;
    } else if (updateData.serviceId !== undefined && updateData.serviceId !== null) {
      updateData.serviceId = parseInt(updateData.serviceId);
    }

    if (updateData.enterpriseId === '') {
      updateData.enterpriseId = null;
    } else if (updateData.enterpriseId !== undefined && updateData.enterpriseId !== null) {
      updateData.enterpriseId = parseInt(updateData.enterpriseId);
    }

    if (req.user.enterpriseId) {
       // Cannot change your enterprise if you are bounded to one
       delete updateData.enterpriseId;
    }

    const whereClause = { id: parseInt(id) };
    if (isServiceManager(req.user)) {
      const target = await ensureManagedTarget(req.user, id);
      if (!target) {
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable dans votre service.' });
      }
      const restrictedFields = ['password', 'roleId', 'serviceId', 'enterpriseId', 'isActive', 'mustChangePassword'];
      if (restrictedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field))) {
        return res.status(403).json({
          success: false,
          message: 'Le responsable peut modifier les coordonnées du membre, pas son rôle, son service, son statut ou son mot de passe.',
        });
      }
      const permittedFields = ['email', 'firstName', 'lastName', 'phone', 'position', 'employeeNumber'];
      Object.keys(updateData).forEach((field) => {
        if (!permittedFields.includes(field)) delete updateData[field];
      });
      whereClause.serviceId = target.serviceId;
    }
    if (req.user.enterpriseId) {
      whereClause.enterpriseId = req.user.enterpriseId;
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: whereClause,
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use',
        });
      }
    }

    // Hash new password if provided
    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
      updateData.mustChangePassword = true;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        serviceId: true,
        enterpriseId: true,
        isActive: true,
        avatarUrl: true,
        employeeNumber: true,
        phone: true,
        position: true,
        department: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: id,
        details: `User ${updatedUser.email} updated`,
        oldValue: JSON.stringify(existingUser),
        newValue: JSON.stringify(updateData),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating user',
      errors: error.message,
    });
  }
};

/**
 * Delete user (soft delete by setting isActive to false)
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const whereClause = { id: parseInt(id) };
    if (req.user.enterpriseId) {
      whereClause.enterpriseId = req.user.enterpriseId;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: whereClause,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting yourself
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Soft delete - set isActive to false
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: id,
        details: `User ${user.email} deleted (soft)`,
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting user',
      errors: error.message,
    });
  }
};

module.exports = { createUser, updateUser, deleteUser };
