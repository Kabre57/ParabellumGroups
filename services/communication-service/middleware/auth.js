const axios = require('axios');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    // Vérifier le token auprès du service d'authentification
    const response = await axios.get('http://localhost:4001/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });

    req.user = response.data.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Non autorisé' });
  }
};

module.exports = authMiddleware;
