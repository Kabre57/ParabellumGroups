const rateLimit = require('express-rate-limit');

/**
 * Rate limiter pour les tentatives de connexion
 * 5 tentatives maximum toutes les 15 minutes
 */
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: {
    success: false,
    error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  validate: { trustProxy: false },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Trop de tentatives de connexion',
      message: 'Votre compte a été temporairement verrouillé après trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  }
});

/**
 * Rate limiter pour les inscriptions
 * 3 inscriptions maximum par heure par IP
 */
const registerLimiter = rateLimit({
  windowMs: parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000,
  max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX) || 3,
  message: {
    success: false,
    error: 'Trop de créations de compte. Veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Trop de créations de compte',
      message: 'Vous avez atteint la limite de créations de compte pour cette heure. Veuillez réessayer plus tard.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  }
});

/**
 * Rate limiter pour le rafraîchissement des tokens
 * 10 rafraîchissements maximum toutes les 15 minutes
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Trop de rafraîchissements de token. Veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

/**
 * Rate limiter global pour toutes les routes API
 * 100 requêtes maximum par 15 minutes
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Trop de requêtes. Veuillez ralentir.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

/**
 * Rate limiter strict pour les opérations sensibles
 * (changement de mot de passe, réinitialisation, etc.)
 * 3 tentatives maximum par heure
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Trop de tentatives. Veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Limite de sécurité atteinte',
      message: 'Vous avez effectué trop de tentatives pour cette action sensible. Veuillez réessayer dans 1 heure.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  }
});

module.exports = {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  globalLimiter,
  strictLimiter
};
