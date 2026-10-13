// Lecture et recherche des comptes utilisateurs.
const { validationResult, prisma } = require('./shared');

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

    if (req.user.enterpriseId) {
      where.enterpriseId = req.user.enterpriseId;
    } else if (req.query.enterpriseId) {
      where.enterpriseId = parseInt(req.query.enterpriseId);
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
        enterpriseId: true,
        isActive: true,
        lastLogin: true,
        avatarUrl: true,
        employeeNumber: true,
        phone: true,
        position: true,
        department: true,
        createdAt: true,
        updatedAt: true,
        enterprise: {
          select: {
            id: true,
            name: true,
          },
        },
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
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const whereClause = { id: parseInt(id) };
    if (req.user.enterpriseId) {
      whereClause.enterpriseId = req.user.enterpriseId;
    }

    const user = await prisma.user.findUnique({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        serviceId: true,
        enterpriseId: true,
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

module.exports = { getAllUsers, getUserById };
