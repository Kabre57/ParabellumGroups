// Renouvelle une session à partir du jeton de rafraîchissement.
const { prisma, verifyRefreshToken, getUserPermissionNames, generateAccessToken, generateRefreshToken } = require('./shared');

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    // Verify refresh token JWT
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    // Check if token exists in DB and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
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
        },
      }
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    if (storedToken.isRevoked) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token revoked'
      });
    }

    if (new Date() > storedToken.expiresAt) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    if (!storedToken.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    const permissionsList = await getUserPermissionNames(storedToken.user.id);
    storedToken.user.permissionsList = permissionsList;

    // Generate new access token and refresh token
    const accessToken = generateAccessToken(storedToken.user);
    const newRefreshToken = generateRefreshToken(storedToken.user);

    // Update refresh token in DB (revoke old, create new)
    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true }
    });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      errors: error.message,
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */

module.exports = { refreshToken };
