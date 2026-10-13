// Traite les demandes de récupération du mot de passe.
const { validationResult, prisma } = require('./shared');

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis',
      });
    }

    // Ne pas révéler si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUEST',
          entityType: 'User',
          entityId: user.id.toString(),
          details: `Password reset requested for ${user.email}`,
          level: 'SECURITY',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Si un compte existe, un email de réinitialisation a été envoyé',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande de réinitialisation',
      errors: error.message,
    });
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */

module.exports = { forgotPassword };
