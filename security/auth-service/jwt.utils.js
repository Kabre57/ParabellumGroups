const jwt = require('jsonwebtoken');

/**
 * Configuration des secrets JWT avec support de rotation
 */
const secrets = {
  access: {
    current: process.env.JWT_SECRET,
    previous: process.env.JWT_SECRET_OLD || null
  },
  refresh: {
    current: process.env.JWT_REFRESH_SECRET,
    previous: process.env.JWT_REFRESH_SECRET_OLD || null
  }
};

const expiresIn = {
  access: process.env.JWT_EXPIRES_IN || '15m',
  refresh: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};

/**
 * Génère un Access Token JWT
 * @param {Object} user - Objet utilisateur
 * @returns {string} Token JWT
 */
const generateAccessToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(payload, secrets.access.current, {
    expiresIn: expiresIn.access,
    issuer: 'parabellum-auth',
    audience: 'parabellum-api'
  });
};

/**
 * Génère un Refresh Token JWT
 * @param {Object} user - Objet utilisateur
 * @returns {string} Token JWT
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user.id,
    type: 'refresh'
  };

  return jwt.sign(payload, secrets.refresh.current, {
    expiresIn: expiresIn.refresh,
    issuer: 'parabellum-auth',
    audience: 'parabellum-api'
  });
};

/**
 * Vérifie un Access Token avec support de rotation des secrets
 * @param {string} token - Token JWT à vérifier
 * @returns {Object} Payload décodé
 * @throws {Error} Si le token est invalide
 */
const verifyAccessToken = (token) => {
  const options = {
    issuer: 'parabellum-auth',
    audience: 'parabellum-api'
  };

  try {
    // Essayer avec le secret actuel
    return jwt.verify(token, secrets.access.current, options);
  } catch (error) {
    // Si échec et qu'un ancien secret existe, essayer avec
    if (secrets.access.previous && error.name === 'JsonWebTokenError') {
      try {
        return jwt.verify(token, secrets.access.previous, options);
      } catch (oldError) {
        throw error; // Lancer l'erreur originale
      }
    }
    throw error;
  }
};

/**
 * Vérifie un Refresh Token avec support de rotation des secrets
 * @param {string} token - Token JWT à vérifier
 * @returns {Object} Payload décodé
 * @throws {Error} Si le token est invalide
 */
const verifyRefreshToken = (token) => {
  const options = {
    issuer: 'parabellum-auth',
    audience: 'parabellum-api'
  };

  try {
    // Essayer avec le secret actuel
    return jwt.verify(token, secrets.refresh.current, options);
  } catch (error) {
    // Si échec et qu'un ancien secret existe, essayer avec
    if (secrets.refresh.previous && error.name === 'JsonWebTokenError') {
      try {
        return jwt.verify(token, secrets.refresh.previous, options);
      } catch (oldError) {
        throw error;
      }
    }
    throw error;
  }
};

/**
 * Décode un token sans vérification (pour debugging)
 * @param {string} token - Token JWT
 * @returns {Object} Payload décodé
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken
};
