const {
  prisma,
  comparePassword,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  setStorageAccessCookie,
  getUserPermissionNames,
} = require('./shared');

const changePassword = async (req, res) => {
  try {
    const currentPassword = typeof req.body.currentPassword === 'string'
      ? req.body.currentPassword.normalize('NFC').trim()
      : '';
    const newPassword = typeof req.body.newPassword === 'string'
      ? req.body.newPassword.normalize('NFC').trim()
      : '';

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Saisissez le mot de passe actuel et le nouveau mot de passe.' });
    }
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    const currentPasswordIsValid = await comparePassword(currentPassword, user.passwordHash);
    if (!currentPasswordIsValid) {
      return res.status(400).json({ success: false, message: 'Le mot de passe actuel est incorrect.' });
    }
    if (await comparePassword(newPassword, user.passwordHash)) {
      return res.status(400).json({ success: false, message: 'Choisissez un mot de passe différent du mot de passe actuel.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      // Keep the account gated until the temporary refresh sessions are revoked.
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: true },
    });

    // Invalidate all sessions that were issued before this password change.
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
      include: {
        role: { select: { id: true, name: true, code: true, description: true } },
        service: { select: { id: true, name: true, description: true } },
        enterprise: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    const permissionsList = await getUserPermissionNames(user.id);
    const authenticatedUser = { ...updatedUser, mustChangePassword: false, permissionsList };
    const accessToken = generateAccessToken(authenticatedUser);
    const refreshToken = generateRefreshToken(authenticatedUser);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiresAt(refreshToken),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_PASSWORD_CHANGED',
        entityType: 'User',
        entityId: String(user.id),
        details: 'User changed password after authentication',
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    }).catch((auditError) => {
      console.error('Password change audit log error:', auditError);
    });

    const { passwordHash, ...safeUser } = authenticatedUser;
    setStorageAccessCookie(res, accessToken);
    return res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès.',
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Impossible de modifier le mot de passe pour le moment.' });
  }
};

module.exports = { changePassword };
