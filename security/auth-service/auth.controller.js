const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const prisma = new PrismaClient();

/**
 * Inscription d'un nouvel utilisateur
 */
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }

    // Hacher le mot de passe
    const passwordHash = await hashPassword(password);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || 'EMPLOYEE',
        isActive: true
      }
    });

    // Générer les tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Stocker le refresh token en BDD
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Log d'audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        entityType: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Retourner la réponse (sans le passwordHash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Connexion utilisateur
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Compte désactivé. Contactez l\'administrateur.'
      });
    }

    // Générer les tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Stocker le refresh token en BDD
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Mettre à jour lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Log d'audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Retourner la réponse
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rafraîchir l'access token
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token manquant'
      });
    }

    // Vérifier le token JWT
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token invalide ou expiré'
      });
    }

    // Vérifier que le token existe en BDD et n'est pas révoqué
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token non trouvé'
      });
    }

    if (storedToken.isRevoked) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token révoqué'
      });
    }

    if (new Date() > storedToken.expiresAt) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expiré'
      });
    }

    // Vérifier que l'utilisateur est toujours actif
    if (!storedToken.user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Compte désactivé'
      });
    }

    // Générer un nouvel access token
    const newAccessToken = generateAccessToken(storedToken.user);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Déconnexion utilisateur
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Révoquer le refresh token
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId: req.user.id
        },
        data: {
          isRevoked: true
        }
      });
    }

    // Log d'audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'LOGOUT',
        entityType: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Révoquer tous les tokens d'un utilisateur
 * (utile en cas de changement de mot de passe ou de compromission)
 */
const revokeAllTokens = async (req, res, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: {
        userId: req.user.id,
        isRevoked: false
      },
      data: {
        isRevoked: true
      }
    });

    // Log d'audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REVOKE_ALL_TOKENS',
        entityType: 'RefreshToken',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Tous les tokens ont été révoqués'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir l'utilisateur actuel
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const { passwordHash: _, ...userWithoutPassword } = req.user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  revokeAllTokens,
  getCurrentUser
};
