const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Non autorisé - Token manquant' 
    });
  }

  const token = authHeader.substring(7);
  
  // TODO: Implémenter la validation JWT réelle
  // Pour le moment, on simule une authentification basique
  if (!token || token.length < 10) {
    return res.status(401).json({ 
      error: 'Non autorisé - Token invalide' 
    });
  }

  // Simuler l'extraction des infos utilisateur du token
  req.user = {
    id: 'user-uuid',
    email: 'user@example.com',
    role: 'USER'
  };

  next();
};

module.exports = { authenticate };
