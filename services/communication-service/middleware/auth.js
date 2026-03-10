const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    // Vérifier le token auprès du service d'authentification
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    req.user = response.data?.data?.user || response.data?.user || response.data?.data || response.data;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Non autorisé' });
  }
};

module.exports = authMiddleware;
