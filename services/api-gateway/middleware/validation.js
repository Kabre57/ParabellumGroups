const Joi = require('joi');

/**
 * Schémas de validation pour les endpoints d'authentification
 */
const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email invalide',
        'any.required': 'Email requis'
      }),
    password: Joi.string().min(8).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
        'any.required': 'Mot de passe requis'
      }),
    firstName: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Le prénom doit contenir au moins 2 caractères',
        'string.max': 'Le prénom ne peut pas dépasser 50 caractères',
        'any.required': 'Prénom requis'
      }),
    lastName: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut pas dépasser 50 caractères',
        'any.required': 'Nom requis'
      }),
    role: Joi.string().valid('ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER').optional()
      .messages({
        'any.only': 'Rôle invalide'
      }),
    serviceId: Joi.number().integer().positive().optional()
      .messages({
        'number.positive': 'L\'ID du service doit être positif'
      })
  }),

  login: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email invalide',
        'any.required': 'Email requis'
      }),
    password: Joi.string().required()
      .messages({
        'any.required': 'Mot de passe requis'
      })
  }),

  refresh: Joi.object({
    refreshToken: Joi.string().required()
      .messages({
        'any.required': 'Refresh token requis'
      })
  }),

  logout: Joi.object({
    refreshToken: Joi.string().optional()
  })
};

/**
 * Schémas de validation pour les utilisateurs
 */
const userSchemas = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    role: Joi.string().valid('ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER').optional(),
    serviceId: Joi.number().integer().positive().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
      .messages({
        'string.pattern.base': 'Numéro de téléphone invalide (format E.164)'
      })
  }),

  update: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).optional(),
    lastName: Joi.string().trim().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    position: Joi.string().max(100).optional(),
    department: Joi.string().max(100).optional(),
    avatarUrl: Joi.string().uri().optional()
  }).min(1)
};

/**
 * Schémas de validation pour les services
 */
const serviceSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required()
      .messages({
        'string.min': 'Le nom du service doit contenir au moins 2 caractères',
        'string.max': 'Le nom du service ne peut pas dépasser 100 caractères',
        'any.required': 'Nom du service requis'
      }),
    description: Joi.string().max(500).optional()
      .messages({
        'string.max': 'La description ne peut pas dépasser 500 caractères'
      })
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().max(500).optional()
  }).min(1)
};

/**
 * Middleware de validation de schéma
 * @param {Joi.Schema} schema - Schéma Joi à valider
 * @param {string} source - Source des données ('body', 'query', 'params')
 * @returns {Function} Middleware Express
 */
function validateSchema(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,  // Retourne toutes les erreurs, pas seulement la première
      stripUnknown: true  // Supprime les champs non définis dans le schéma
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors
      });
    }

    // Remplace les données par les valeurs validées et nettoyées
    req[source] = value;
    next();
  };
}

/**
 * Middleware de validation pour les paramètres d'URL
 */
const validateParams = {
  id: validateSchema(
    Joi.object({
      id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'L\'ID doit être un nombre',
          'number.positive': 'L\'ID doit être positif',
          'any.required': 'ID requis'
        })
    }),
    'params'
  )
};

/**
 * Middleware de validation pour les query parameters
 */
const validateQuery = {
  pagination: validateSchema(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').default('asc')
    }),
    'query'
  )
};

module.exports = {
  validateSchema,
  validateParams,
  validateQuery,
  schemas: {
    auth: authSchemas,
    user: userSchemas,
    service: serviceSchemas
  }
};
