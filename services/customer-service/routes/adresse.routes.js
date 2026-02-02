const express = require('express');
const { body, query } = require('express-validator');
const adresseController = require('../controllers/adresse.controller');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('typeAdresse').isIn(['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE']).withMessage('Type d\'adresse invalide'),
  body('ligne1').notEmpty().trim().withMessage('La ligne 1 est requise'),
  body('codePostal').notEmpty().matches(/^[0-9]{5}$/).withMessage('Code postal invalide (5 chiffres)'),
  body('ville').notEmpty().trim().withMessage('La ville est requise'),
  body('pays').optional().isString().withMessage('Le pays doit être une chaîne de caractères')
];

const updateValidation = [
  body('typeAdresse').optional().isIn(['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE']).withMessage('Type d\'adresse invalide'),
  body('ligne1').optional().notEmpty().trim().withMessage('La ligne 1 ne peut pas être vide'),
  body('codePostal').optional().matches(/^[0-9]{5}$/).withMessage('Code postal invalide (5 chiffres)'),
  body('ville').optional().notEmpty().trim().withMessage('La ville ne peut pas être vide')
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