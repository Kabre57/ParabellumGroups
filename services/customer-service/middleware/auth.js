// Simple authentication middleware - checks for X-User-Id header
const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ 
      error: 'Non autorisé - Header X-User-Id requis' 
    });
  }

  // Attach userId to request for use in controllers
  req.userId = userId;
  next();
};

module.exports = authMiddleware;
