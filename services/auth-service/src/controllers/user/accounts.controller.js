// Création, modification et suppression des comptes.
const { validationResult, prisma, hashPassword } = require('./shared');
const { DEFAULT_INITIAL_PASSWORD } = require('../../utils/password');
const {
  isServiceManager,
  getManagedServices,
  ensureManagedTarget,
} = require('../../utils/serviceManagerScope');
const { getActiveEnterpriseId, isGlobalAdmin } = require('../../utils/roleScope');

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

    const { email, password, firstName, lastName, serviceId, enterpriseId, phone, position } = req.body;
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

    const finalEnterpriseId = isServiceManager(req.user)
      ? managedService.enterpriseId
      : isGlobalAdmin(req.user)
        ? Number(enterpriseId)
        : getActiveEnterpriseId(req);

    if (!Number.isInteger(finalEnterpriseId) || finalEnterpriseId <= 0) {
      return res.status(400).json({ success: false, message: 'Sélectionnez une entreprise valide avant de créer le compte.' });
    }
    if (!isServiceManager(req.user)) {
      const enterprise = await prisma.enterprise.findFirst({
        where: { id: finalEnterpriseId, isActive: true },
        select: { id: true },
      });
      if (!enterprise) {
        return res.status(400).json({ success: false, message: 'L’entreprise sélectionnée est introuvable ou inactive.' });
      }
    }

    // New administrator-created accounts stay inactive without a role until
    // the company-specific access profile is assigned.
    let finalRoleId = null;
    if (isServiceManager(req.user)) {
      const employeeRole = await prisma.role.findUnique({
        where: { code: 'SERVICE_MEMBER' },
      });
      finalRoleId = employeeRole?.id || null;
      if (!finalRoleId) {
        return res.status(500).json({ success: false, message: 'Le rôle membre de service requis est indisponible.' });
      }
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
        serviceId: isServiceManager(req.user) ? managedService.id : null,
        enterpriseId: finalEnterpriseId,
        isActive: isServiceManager(req.user),
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

    if (updateData.roleId === '') {
      updateData.roleId = null;
    } else if (updateData.roleId !== undefined && updateData.roleId !== null) {
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

    if (req.user.enterpriseId && !isGlobalAdmin(req.user)) {
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
    const activeEnterpriseId = getActiveEnterpriseId(req);
    if (!isGlobalAdmin(req.user) && activeEnterpriseId) whereClause.enterpriseId = activeEnterpriseId;

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

    const targetEnterpriseId = updateData.enterpriseId !== undefined
      ? updateData.enterpriseId
      : existingUser.enterpriseId;
    const nextRoleId = Object.prototype.hasOwnProperty.call(updateData, 'roleId')
      ? updateData.roleId
      : existingUser.roleId;
    const nextIsActive = updateData.isActive !== undefined ? updateData.isActive : existingUser.isActive;
    if (nextIsActive && !targetEnterpriseId) {
      return res.status(400).json({ success: false, message: 'Rattachez le compte à une entreprise avant de l’activer.' });
    }
    if (nextIsActive && !nextRoleId) {
      return res.status(400).json({ success: false, message: 'Attribuez un rôle à cet utilisateur avant de l’activer.' });
    }
    let nextRole = null;
    if (nextRoleId) {
      nextRole = await prisma.role.findUnique({
        where: { id: Number(nextRoleId) },
        select: { id: true, enterpriseId: true, code: true, isActive: true },
      });
      if (!nextRole || !nextRole.isActive || (nextRole.enterpriseId !== null && nextRole.enterpriseId !== targetEnterpriseId)) {
        return res.status(400).json({ success: false, message: 'Le rôle doit être global ou appartenir à la même entreprise que l’utilisateur.' });
      }
    }

    const nextServiceId = Object.prototype.hasOwnProperty.call(updateData, 'serviceId')
      ? updateData.serviceId
      : existingUser.serviceId;
    const serviceRequiredForRole = ['SERVICE_MANAGER', 'COMMERCIAL', 'PURCHASING_MANAGER', 'TECHNICIAN'].includes(nextRole?.code || '');
    if (nextIsActive && serviceRequiredForRole && !nextServiceId) {
      return res.status(400).json({ success: false, message: 'Sélectionnez un service pour ce profil avant d’activer le compte.' });
    }
    if (nextServiceId) {
      const service = await prisma.service.findFirst({
        where: { id: Number(nextServiceId), enterpriseId: targetEnterpriseId },
        select: { id: true },
      });
      if (!service) {
        return res.status(400).json({ success: false, message: 'Le service doit être rattaché à la même entreprise que l’utilisateur.' });
      }
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
    const activeEnterpriseId = getActiveEnterpriseId(req);
    if (!isGlobalAdmin(req.user) && activeEnterpriseId) whereClause.enterpriseId = activeEnterpriseId;

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
