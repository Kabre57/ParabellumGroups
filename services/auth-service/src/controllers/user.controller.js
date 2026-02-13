const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { hashPassword } = require('../utils/password');

/**
 * Get all users with pagination and filtering
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      roleId,
      serviceId,
      isActive,
      search,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (roleId) {
      where.roleId = parseInt(roleId);
    } else if (role) {
      const roleRecord = await prisma.role.findUnique({
        where: { code: role },
      });
      if (roleRecord) {
        where.roleId = roleRecord.id;
      }
    }

    if (serviceId) {
      where.serviceId = parseInt(serviceId);
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        serviceId: true,
        isActive: true,
        lastLogin: true,
        avatarUrl: true,
        employeeNumber: true,
        phone: true,
        position: true,
        department: true,
        createdAt: true,
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
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching users',
      errors: error.message,
    });
  }
};

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

    const { email, password, firstName, lastName, roleId, serviceId, isActive } = req.body;

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
    let finalRoleId = roleId;
    if (!finalRoleId) {
      const employeeRole = await prisma.role.findUnique({
        where: { code: 'EMPLOYEE' },
      });
      finalRoleId = employeeRole?.id || null;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: finalRoleId,
        serviceId: serviceId ? parseInt(serviceId) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        serviceId: true,
        isActive: true,
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
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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
        registrationNumber: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        placeOfBirth: true,
        nationality: true,
        socialSecurityNumber: true,
        cnpsNumber: true,
        cnamNumber: true,
        bankAccount: true,
        emergencyContact: true,
        position: true,
        department: true,
        category: true,
        level: true,
        manager: true,
        hireDate: true,
        createdAt: true,
        updatedAt: true,
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
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user',
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
};
