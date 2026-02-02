const express = require('express');
const { body, query } = require('express-validator');
const contratController = require('../controllers/contrat.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('titre').notEmpty().trim().withMessage('Le titre est requis'),
  body('typeContrat').isIn(['MAINTENANCE', 'SERVICE', 'PRODUIT', 'PARTENARIAT', 'ABONNEMENT', 'FORFAIT', 'CONSULTING', 'FORMATION', 'LICENCE', 'SAAS']).withMessage('Type de contrat invalide'),
  body('dateDebut').isISO8601().withMessage('Date de début invalide'),
  body('montantHT').isFloat({ min: 0 }).withMessage('Le montant HT doit être un nombre positif'),
  body('tauxTVA').optional().isFloat({ min: 0, max: 100 }).withMessage('Le taux de TVA doit être compris entre 0 et 100'),
  body('devise').optional().isLength({ min: 3, max: 3 }).withMessage('La devise doit être sur 3 caractères (ex: EUR)')
];

const statusValidation = [
  body('status').isIn(['BROUILLON', 'EN_ATTENTE_SIGNATURE', 'ACTIF', 'SUSPENDU', 'RESILIE', 'TERMINE', 'EN_RENOUVELLEMENT']).withMessage('Status invalide'),
  body('motif').optional().isString().withMessage('Le motif doit être une chaîne de caractères')
];

const avenantValidation = [
  body('description').notEmpty().withMessage('La description est requise'),
  body('modifications').isObject().withMessage('Les modifications doivent être un objet'),
  body('dateEffet').isISO8601().withMessage('Date d\'effet invalide'),
  body('montantAdditionnel').optional().isFloat().withMessage('Le montant additionnel doit être un nombre')
];

// Query validation
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un nombre positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
  query('status').optional().isIn(['BROUILLON', 'EN_ATTENTE_SIGNATURE', 'ACTIF', 'SUSPENDU', 'RESILIE', 'TERMINE', 'EN_RENOUVELLEMENT']).withMessage('Status invalide'),
  query('typeContrat').optional().isIn(['MAINTENANCE', 'SERVICE', 'PRODUIT', 'PARTENARIAT', 'ABONNEMENT', 'FORFAIT', 'CONSULTING', 'FORMATION', 'LICENCE', 'SAAS']).withMessage('Type de contrat invalide'),
  query('sortBy').optional().isIn(['dateDebut', 'dateFin', 'createdAt', 'montantHT', 'montantTTC']).withMessage('Champ de tri invalide'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Ordre de tri invalide')
];

// Routes
router.get('/', authMiddleware, queryValidation, contratController.getAll);
router.post('/', authMiddleware, requireManager, createValidation, contratController.create);
router.get('/stats', authMiddleware, contratController.getStats);
router.get('/expiring', authMiddleware, contratController.getExpiringSoon);
router.get('/:id', authMiddleware, contratController.getById);
router.patch('/:id/status', authMiddleware, statusValidation, contratController.updateStatus);
router.post('/:id/avenants', authMiddleware, avenantValidation, contratController.createAvenant);

module.exports = router;