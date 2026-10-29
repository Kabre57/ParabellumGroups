const express = require('express');
const jwt = require('jsonwebtoken');
const { listPushTokensForService } = require('../controllers/pushToken.controller');

const router = express.Router();

router.use((req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !process.env.JWT_SECRET) return res.status(401).json({ success: false, message: 'Authentification du service requise.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'parabellum-notification-service' });
    if (payload.serviceName !== 'notification-service') throw new Error('Service non autorisé.');
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Jeton de service invalide ou expiré.' });
  }
});

router.get('/:userId', listPushTokensForService);

module.exports = router;
