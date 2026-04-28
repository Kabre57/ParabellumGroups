const express = require('express');
const { body, query } = require('express-validator');
const contactController = require('../controllers/contact.controller');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const PHONE_PATTERN = /^[0-9+().\s-]{6,20}$/;

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('prenom').notEmpty().trim().withMessage('Le prénom est requis'),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Email invalide'),
  body('emailSecondaire').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Email secondaire invalide'),
  body('telephone').optional({ checkFalsy: true }).matches(PHONE_PATTERN).withMessage('Numéro de téléphone invalide'),
  body('mobile').optional({ checkFalsy: true }).matches(PHONE_PATTERN).withMessage('Numéro de mobile invalide'),
  body('type').optional({ checkFalsy: true }).isIn(['COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE']).withMessage('Type de contact invalide'),
  body('statut').optional({ checkFalsy: true }).isIn(['ACTIF', 'INACTIF', 'PARTI']).withMessage('Statut invalide')
];

const updateValidation = [
  body('nom').optional().notEmpty().trim().withMessage('Le nom ne peut pas être vide'),
  body('prenom').optional().notEmpty().trim().withMessage('Le prénom ne peut pas être vide'),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Email invalide'),
  body('emailSecondaire').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Email secondaire invalide'),
  body('telephone').optional({ checkFalsy: true }).matches(PHONE_PATTERN).withMessage('Numéro de téléphone invalide'),
  body('mobile').optional({ checkFalsy: true }).matches(PHONE_PATTERN).withMessage('Numéro de mobile invalide'),
  body('type').optional({ checkFalsy: true }).isIn(['COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE']).withMessage('Type de contact invalide'),
  body('statut').optional({ checkFalsy: true }).isIn(['ACTIF', 'INACTIF', 'PARTI']).withMessage('Statut invalide')
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
