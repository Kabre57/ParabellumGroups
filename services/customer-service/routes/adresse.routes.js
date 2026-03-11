const express = require('express');
const { body, query } = require('express-validator');
const adresseController = require('../controllers/adresse.controller');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('typeAdresse').isIn(['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE']).withMessage('Type d\'adresse invalide'),
  body('nomAdresse').optional({ checkFalsy: true }).isString().trim().withMessage('Le nom de l\'adresse est invalide'),
  body('ligne1').notEmpty().trim().withMessage('La ligne 1 est requise'),
  body('ligne2').optional({ checkFalsy: true }).isString().trim().withMessage('La ligne 2 est invalide'),
  body('ligne3').optional({ checkFalsy: true }).isString().trim().withMessage('La ligne 3 est invalide'),
  body('codePostal').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Code postal invalide'),
  body('ville').notEmpty().trim().withMessage('La ville est requise'),
  body('region').optional({ checkFalsy: true }).isString().trim().withMessage('La région est invalide'),
  body('pays').optional({ checkFalsy: true }).isString().trim().withMessage('Le pays doit être une chaîne de caractères'),
  body('coordonneesGps').optional({ checkFalsy: true }).isString().trim().withMessage('Les coordonnées GPS sont invalides'),
  body('informationsAcces').optional({ checkFalsy: true }).isString().trim().withMessage('Les informations d\'accès sont invalides')
];

const updateValidation = [
  body('typeAdresse').optional().isIn(['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE']).withMessage('Type d\'adresse invalide'),
  body('nomAdresse').optional({ checkFalsy: true }).isString().trim().withMessage('Le nom de l\'adresse est invalide'),
  body('ligne1').optional().notEmpty().trim().withMessage('La ligne 1 ne peut pas être vide'),
  body('ligne2').optional({ checkFalsy: true }).isString().trim().withMessage('La ligne 2 est invalide'),
  body('ligne3').optional({ checkFalsy: true }).isString().trim().withMessage('La ligne 3 est invalide'),
  body('codePostal').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Code postal invalide'),
  body('ville').optional().notEmpty().trim().withMessage('La ville ne peut pas être vide'),
  body('region').optional({ checkFalsy: true }).isString().trim().withMessage('La région est invalide'),
  body('pays').optional({ checkFalsy: true }).isString().trim().withMessage('Le pays est invalide'),
  body('coordonneesGps').optional({ checkFalsy: true }).isString().trim().withMessage('Les coordonnées GPS sont invalides'),
  body('informationsAcces').optional({ checkFalsy: true }).isString().trim().withMessage('Les informations d\'accès sont invalides')
];

// Query validation
const queryValidation = [
  query('clientId').notEmpty().withMessage('Le clientId est requis'),
  query('typeAdresse').optional().isIn(['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE']).withMessage('Type d\'adresse invalide')
];

// Routes
router.get('/', authMiddleware, queryValidation, adresseController.getAll);
router.post('/', authMiddleware, createValidation, adresseController.create);
router.get('/:id', authMiddleware, adresseController.getById);
router.put('/:id', authMiddleware, updateValidation, adresseController.update);
router.delete('/:id', authMiddleware, adresseController.delete);
router.patch('/:id/principal', authMiddleware, adresseController.setPrincipal);

module.exports = router;
