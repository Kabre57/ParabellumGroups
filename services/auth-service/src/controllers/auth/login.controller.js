// Vérifie les identifiants et ouvre une session utilisateur.
const { validationResult, prisma, comparePassword, generateAccessToken, generateRefreshToken, getUserPermissionNames } = require('./shared');

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const rawEmail = typeof req.body.email === 'string' ? req.body.email : '';
    const rawPassword = typeof req.body.password === 'string' ? req.body.password : '';
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.normalize('NFC').trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        service: {
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
        enterprise: {
          select: { id: true, name: true, logoUrl: true }
        }
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Adresse email ou mot de passe incorrect',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive',
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Adresse email ou mot de passe incorrect',
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id.toString(),
        details: `User ${user.email} logged in`,
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

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

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          ...userWithoutPassword,
          permissionsList,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error logging in',
      errors: error.message,
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */

module.exports = { login };
