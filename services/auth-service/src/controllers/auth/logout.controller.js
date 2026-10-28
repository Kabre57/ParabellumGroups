// Révoque le jeton de session présenté à la déconnexion.
const { prisma, clearStorageAccessCookie } = require('./shared');

const logout = async (req, res) => {
  try {
    clearStorageAccessCookie(res);
    const { refreshToken } = req.body || {};

    if (refreshToken) {
      // Revoke the refresh token
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId: req.user?.id
        },
        data: {
          isRevoked: true
        }
      });
    }

    // Log audit if user is authenticated
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'USER_LOGOUT',
          entityType: 'User',
          entityId: req.user.id.toString(),
          details: `User ${req.user.email} logged out`,
          level: 'INFO',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error logging out',
      errors: error.message,
    });
  }
};

/**
 * Forgot password (request reset)
 * POST /api/auth/forgot-password
 */

module.exports = { logout };
