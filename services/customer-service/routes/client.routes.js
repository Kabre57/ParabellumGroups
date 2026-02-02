const express = require('express');
const { body, query } = require('express-validator');
const clientController = require('../controllers/client.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('typeClientId').notEmpty().withMessage('Le type de client est requis'),
  body('telephone').optional().isMobilePhone('fr-FR').withMessage('Numéro de téléphone invalide'),
  body('siret').optional().isLength({ min: 14, max: 14 }).withMessage('SIRET invalide (14 caractères)'),
  body('tvaIntra').optional().matches(/^[A-Z]{2}[0-9]{11}$/).withMessage('Numéro de TVA intracommunautaire invalide')
];

const updateValidation = [
  body('nom').optional().notEmpty().trim().withMessage('Le nom ne peut pas être vide'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
  body('typeClientId').optional().notEmpty().withMessage('Le type de client est requis'),
  body('telephone').optional().isMobilePhone('fr-FR').withMessage('Numéro de téléphone invalide'),
  body('siret').optional().isLength({ min: 14, max: 14 }).withMessage('SIRET invalide (14 caractères)'),
  body('tvaIntra').optional().matches(/^[A-Z]{2}[0-9]{11}$/).withMessage('Numéro de TVA intracommunautaire invalide')
];

const statusValidation = [
  body('status').isIn(['PROSPECT', 'ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE', 'LEAD_CHAUD', 'LEAD_FROID']).withMessage('Status invalide'),
  body('raison').optional().isString().withMessage('La raison doit être une chaîne de caractères')
];

const priorityValidation = [
  body('priorite').isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorité invalide'),
  body('raison').optional().isString().withMessage('La raison doit être une chaîne de caractères')
];

// Query validation
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un nombre positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
  query('status').optional().isIn(['PROSPECT', 'ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE', 'LEAD_CHAUD', 'LEAD_FROID']).withMessage('Status invalide'),
  query('priorite').optional().isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorité invalide'),
  query('sortBy').optional().isIn(['nom', 'createdAt', 'updatedAt', 'scoreFidelite', 'chiffreAffaireAnnuel']).withMessage('Champ de tri invalide'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Ordre de tri invalide')
];

// Routes
router.get('/', authMiddleware, queryValidation, clientController.getAll);
router.post('/', authMiddleware, requireManager, createValidation, clientController.create);
router.get('/search', authMiddleware, clientController.search);
router.get('/stats', authMiddleware, clientController.getStats);
router.get('/:id', authMiddleware, clientController.getById);
router.put('/:id', authMiddleware, updateValidation, clientController.update);
router.patch('/:id/status', authMiddleware, statusValidation, clientController.updateStatus);
router.patch('/:id/priority', authMiddleware, priorityValidation, clientController.updatePriority);
router.delete('/:id/archive', authMiddleware, requireManager, clientController.archive);

module.exports = router;