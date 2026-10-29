// Gère les liens de récupération à usage unique envoyés par courriel.
const crypto = require('node:crypto');
const { validationResult, prisma, hashPassword } = require('./shared');
const emailService = require('../../services/emailService');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const REQUEST_MESSAGE = 'Si un compte existe pour cette adresse, un lien de réinitialisation va être envoyé.';

const getFrontendUrl = () => {
  const configuredUrl = process.env.FRONTEND_URL || process.env.ADMIN_DASHBOARD_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  return process.env.NODE_ENV === 'production'
    ? 'https://parabellum-erp.online'
    : 'http://localhost:3000';
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Adresse e-mail invalide.' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'Adresse e-mail requise.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
      });

      const webUrl = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      const mobileUrl = `parabellum://reset-password?token=${encodeURIComponent(token)}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#172033;line-height:1.6">
          <h1 style="font-size:22px">Réinitialisation de votre mot de passe</h1>
          <p>Vous avez demandé un nouveau mot de passe pour votre compte Parabellum Groups.</p>
          <p><a href="${webUrl}" style="display:inline-block;padding:12px 18px;background:#315cf5;color:#fff;border-radius:8px;text-decoration:none">Choisir un nouveau mot de passe</a></p>
          <p>Pour ouvrir le lien dans Parabellum Mobile, <a href="${mobileUrl}">touchez ici</a>.</p>
          <p>Ce lien expire dans 30 minutes et ne peut être utilisé qu’une seule fois. Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.</p>
        </div>`;

      let deliverySucceeded = false;
      try {
        await emailService.sendEmail(user.email, 'Réinitialisation de votre mot de passe', html);
        deliverySucceeded = true;
      } catch (deliveryError) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordResetTokenHash: null, passwordResetExpiresAt: null },
        }).catch(() => undefined);
        console.error('Password reset email delivery failed:', deliveryError.message);
      }

      if (deliverySucceeded) await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'PASSWORD_RESET_REQUEST',
            entityType: 'User',
            entityId: String(user.id),
            details: 'Password reset link sent',
            level: 'SECURITY',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
      }).catch((auditError) => console.error('Password reset audit log failed:', auditError.message));
    }

    // Identical response for known and unknown accounts prevents address enumeration.
    return res.status(200).json({ success: true, message: REQUEST_MESSAGE });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Impossible de traiter la demande pour le moment. Réessayez plus tard.',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Le lien ou le nouveau mot de passe est invalide.' });
    }

    const token = String(req.body?.token || '').trim();
    const newPassword = typeof req.body?.newPassword === 'string'
      ? req.body.newPassword.normalize('NFC').trim()
      : '';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findUnique({ where: { passwordResetTokenHash: tokenHash } });
    const expiresAt = user?.passwordResetExpiresAt ? new Date(user.passwordResetExpiresAt) : null;

    if (!user || !expiresAt || expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.' });
    }

    await prisma.user.update({
      where: { passwordResetTokenHash: tokenHash },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: String(user.id),
        details: 'Password reset completed using a single-use email link',
        level: 'SECURITY',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    }).catch((auditError) => console.error('Password reset audit log failed:', auditError.message));

    return res.status(200).json({ success: true, message: 'Votre mot de passe a été réinitialisé.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(400).json({ success: false, message: 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.' });
    }
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Impossible de réinitialiser le mot de passe pour le moment.' });
  }
};

module.exports = { forgotPassword, resetPassword };
