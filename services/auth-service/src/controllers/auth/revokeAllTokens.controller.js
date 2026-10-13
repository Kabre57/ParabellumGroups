// Révoque toutes les sessions actives d’un utilisateur.
const { prisma } = require('./shared');

const revokeAllTokens = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    await prisma.refreshToken.updateMany({
      where: {
        userId: req.user.id,
        isRevoked: false
      },
      data: {
        isRevoked: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REVOKE_ALL_TOKENS',
        entityType: 'RefreshToken',
        details: `All tokens revoked for user ${req.user.email}`,
        level: 'SECURITY',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    return res.json({
      success: true,
      message: 'All tokens have been revoked'
    });
  } catch (error) {
    console.error('Revoke all tokens error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error revoking tokens',
      errors: error.message
    });
  }
};

module.exports = { revokeAllTokens };
