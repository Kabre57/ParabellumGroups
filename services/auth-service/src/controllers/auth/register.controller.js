// Inscrit un compte utilisateur et crée sa première session.
const { validationResult, prisma, hashPassword, generateAccessToken, generateRefreshToken, getUserPermissionNames } = require('./shared');

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password, firstName, lastName, roleId, serviceId } = req.body;

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
        serviceId: serviceId || null,
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
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id.toString(),
        details: `User ${user.email} registered`,
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    const permissionsList = await getUserPermissionNames(user.id);
    user.permissionsList = permissionsList;

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registering user',
      errors: error.message,
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */

module.exports = { register };
