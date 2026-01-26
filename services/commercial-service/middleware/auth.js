const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié - ID utilisateur manquant'
    });
  }

  req.user = {
    id: userId,
    role: userRole || 'user'
  };

  next();
};

module.exports = { authenticateUser };
