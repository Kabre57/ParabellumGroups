const express = require('express');
const { body, query } = require('express-validator');
const opportuniteController = require('../controllers/opportunite.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('montantEstime').isFloat({ min: 0 }).withMessage('Le montant estimé doit être un nombre positif'),
  body('probabilite').optional().isInt({ min: 0, max: 100 }).withMessage('La probabilité doit être entre 0 et 100'),
  body('etape').optional().isIn(['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FINALISATION']).withMessage('Étape invalide'),
  body('statut').optional().isIn(['OUVERTE', 'GAGNEE', 'PERDUE', 'MISE_EN_ATTENTE']).withMessage('Statut invalide')
];

const updateValidation = [
  body('nom').optional().notEmpty().trim().withMessage('Le nom ne peut pas être vide'),
  body('montantEstime').optional().isFloat({ min: 0 }).withMessage('Le montant estimé doit être un nombre positif'),
  body('probabilite').optional().isInt({ min: 0, max: 100 }).withMessage('La probabilité doit être entre 0 et 100'),
  body('etape').optional().isIn(['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FINALISATION']).withMessage('Étape invalide'),
  body('statut').optional().isIn(['OUVERTE', 'GAGNEE', 'PERDUE', 'MISE_EN_ATTENTE']).withMessage('Statut invalide')
];

const stageValidation = [
  body('etape').isIn(['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FINALISATION']).withMessage('Étape invalide'),
  body('notes').optional().isString().withMessage('Les notes doivent être une chaîne de caractères')
];

const closeValidation = [
  body('statut').isIn(['GAGNEE', 'PERDUE']).withMessage('Statut invalide pour fermeture'),
  body('raisonPerdue').optional().isString().withMessage('La raison doit être une chaîne de caractères'),
  body('montantFinal').optional().isFloat({ min: 0 }).withMessage('Le montant final doit être un nombre positif')
];

const productValidation = [
  body('description').notEmpty().trim().withMessage('La description est requise'),
  body('prixUnitaire').isFloat({ min: 0 }).withMessage('Le prix unitaire doit être un nombre positif'),
  body('quantite').isInt({ min: 1 }).withMessage('La quantité doit être un nombre positif'),
  body('tva').optional().isFloat({ min: 0, max: 100 }).withMessage('Le taux de TVA doit être entre 0 et 100'),
  body('remise').optional().isFloat({ min: 0, max: 100 }).withMessage('Le taux de remise doit être entre 0 et 100')
];

// Query validation
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un nombre positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
  query('etape').optional().isIn(['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FINALISATION']).withMessage('Étape invalide'),
  query('statut').optional().isIn(['OUVERTE', 'GAGNEE', 'PERDUE', 'MISE_EN_ATTENTE']).withMessage('Statut invalide'),
  query('sortBy').optional().isIn(['createdAt', 'dateFermetureEstimee', 'montantEstime', 'probabilite']).withMessage('Champ de tri invalide'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Ordre de tri invalide')
];

// Routes
router.get('/', authMiddleware, queryValidation, opportuniteController.getAll);
router.post('/', authMiddleware, requireManager, createValidation, opportuniteController.create);
router.get('/pipeline', authMiddleware, opportuniteController.getPipelineStats);
router.get('/:id', authMiddleware, opportuniteController.getById);
router.put('/:id', authMiddleware, updateValidation, opportuniteController.update);
router.patch('/:id/stage', authMiddleware, stageValidation, opportuniteController.updateStage);
router.patch('/:id/close', authMiddleware, requireManager, closeValidation, opportuniteController.close);
router.post('/:id/products', authMiddleware, productValidation, opportuniteController.addProduct);

module.exports = router;