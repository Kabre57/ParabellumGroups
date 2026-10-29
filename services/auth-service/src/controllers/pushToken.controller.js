const prisma = require('../config/database');

const isExpoPushToken = (value) =>
  typeof value === 'string' && value.length <= 512 && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(value);

exports.registerPushToken = async (req, res) => {
  const { expoPushToken, platform, projectId } = req.body || {};
  if (!isExpoPushToken(expoPushToken)) {
    return res.status(400).json({ success: false, message: 'Token Expo invalide.' });
  }
  if (!['ios', 'android'].includes(platform)) {
    return res.status(400).json({ success: false, message: 'La plateforme doit être ios ou android.' });
  }
  if (projectId !== undefined && (typeof projectId !== 'string' || projectId.length > 128)) {
    return res.status(400).json({ success: false, message: 'projectId invalide.' });
  }
  try {
    const token = await prisma.userPushToken.upsert({
      where: { token: expoPushToken },
      create: { userId: req.user.id, token: expoPushToken, platform, projectId: projectId || null },
      update: { userId: req.user.id, platform, projectId: projectId || null, updatedAt: new Date() },
      select: { id: true, platform: true, updatedAt: true },
    });
    return res.status(200).json({ success: true, data: token });
  } catch (error) {
    console.error('Push token registration failed:', error.message);
    return res.status(500).json({ success: false, message: 'Impossible d’enregistrer le token push.' });
  }
};

exports.revokePushToken = async (req, res) => {
  const { expoPushToken } = req.body || {};
  if (!isExpoPushToken(expoPushToken)) {
    return res.status(400).json({ success: false, message: 'Token Expo invalide.' });
  }
  try {
    const result = await prisma.userPushToken.deleteMany({ where: { userId: req.user.id, token: expoPushToken } });
    return res.status(200).json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('Push token revocation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Impossible de révoquer le token push.' });
  }
};

exports.listPushTokensForService = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Identifiant utilisateur invalide.' });
  }
  try {
    const tokens = await prisma.userPushToken.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });
    return res.json({ success: true, data: tokens });
  } catch (error) {
    console.error('Push token lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Impossible de récupérer les tokens push.' });
  }
};
