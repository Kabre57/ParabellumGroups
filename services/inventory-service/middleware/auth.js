const axios = require('axios');

// Par défaut on cible le service docker "auth-service"
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';

module.exports = async (req, res, next) => {
  try {
    // 1) Confiance aux en-têtes injectés par l'API Gateway
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
      req.user = { id: userIdHeader };
      return next();
    }

    // 2) Sinon, vérification du JWT auprès du service d'auth
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      req.user = response.data?.user || response.data;
      return next();
    }

    return res.status(401).json({ error: 'Token manquant' });
  } catch (error) {
    console.error('Erreur authentification:', error.message);
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};
