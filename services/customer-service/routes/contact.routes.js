const express = require('express');
const { body, query } = require('express-validator');
const contactController = require('../controllers/contact.controller');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('prenom').notEmpty().trim().withMessage('Le prénom est requis'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
  body('telephone').optional().isMobilePhone('fr-FR').withMessage('Numéro de téléphone invalide'),
  body('type').optional().isIn(['COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE']).withMessage('Type de contact invalide')
];

const updateValidation = [
  body('nom').optional().notEmpty().trim().withMessage('Le nom ne peut pas être vide'),
  body('prenom').optional().notEmpty().trim().withMessage('Le prénom ne peut pas être vide'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
  body('telephone').optional().isMobilePhone('fr-FR').withMessage('Numéro de téléphone invalide'),
  body('type').optional().isIn(['COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE']).withMessage('Type de contact invalide'),
  body('statut').optional().isIn(['ACTIF', 'INACTIF', 'PARTI']).withMessage('Statut invalide')
];

// Query validation
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un nombre positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
  query('type').optional().isIn(['COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE']).withMessage('Type de contact invalide'),
  query('statut').optional().isIn(['ACTIF', 'INACTIF', 'PARTI']).withMessage('Statut invalide'),
  query('principal').optional().isBoolean().withMessage('Le paramètre principal doit être un booléen')
];

// Routes
router.get('/', authMiddleware, queryValidation, contactController.getAll);
router.post('/', authMiddleware, createValidation, contactController.create);
router.get('/:id', authMiddleware, contactController.getById);
router.put('/:id', authMiddleware, updateValidation, contactController.update);
router.delete('/:id', authMiddleware, contactController.delete);
router.patch('/:id/principal', authMiddleware, contactController.setPrincipal);

module.exports = router;