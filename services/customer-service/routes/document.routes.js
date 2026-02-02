const express = require('express');
const { body, query } = require('express-validator');
const documentController = require('../controllers/document.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const uploadValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('typeDocument').isIn(['CONTRAT', 'FACTURE', 'DEVIS', 'AVENANT', 'KYC', 'LEGAL', 'TECHNIQUE', 'COMMERCIAL', 'ADMINISTRATIF', 'FINANCIER', 'RAPPORT']).withMessage('Type de document invalide'),
  body('nomFichier').notEmpty().trim().withMessage('Le nom du fichier est requis'),
  body('chemin').notEmpty().trim().withMessage('Le chemin du fichier est requis'),
  body('taille').isInt({ min: 1 }).withMessage('La taille du fichier doit être un nombre positif'),
  body('mimeType').notEmpty().trim().withMessage('Le type MIME est requis')
];

const updateValidation = [
  body('typeDocument').optional().isIn(['CONTRAT', 'FACTURE', 'DEVIS', 'AVENANT', 'KYC', 'LEGAL', 'TECHNIQUE', 'COMMERCIAL', 'ADMINISTRATIF', 'FINANCIER', 'RAPPORT']).withMessage('Type de document invalide'),
  body('nomFichier').optional().notEmpty().trim().withMessage('Le nom du fichier ne peut pas être vide'),
  body('description').optional().isString().withMessage('La description doit être une chaîne de caractères'),
  body('estValide').optional().isBoolean().withMessage('La validité doit être un booléen')
];

const validityValidation = [
  body('estValide').isBoolean().withMessage('La validité doit être un booléen'),
  body('raison').optional().isString().withMessage('La raison doit être une chaîne de caractères')
];

// Query validation
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un nombre positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
  query('typeDocument').optional().isIn(['CONTRAT', 'FACTURE', 'DEVIS', 'AVENANT', 'KYC', 'LEGAL', 'TECHNIQUE', 'COMMERCIAL', 'ADMINISTRATIF', 'FINANCIER', 'RAPPORT']).withMessage('Type de document invalide'),
  query('estValide').optional().isBoolean().withMessage('Le paramètre estValide doit être un booléen')
];

// Routes
router.get('/', authMiddleware, queryValidation, documentController.getAll);
router.post('/upload', authMiddleware, uploadValidation, documentController.upload);
router.get('/expiring', authMiddleware, documentController.getExpiring);
router.get('/:id', authMiddleware, documentController.getById);
router.put('/:id', authMiddleware, requireManager, updateValidation, documentController.update);
router.delete('/:id', authMiddleware, requireManager, documentController.delete);
router.patch('/:id/validity', authMiddleware, validityValidation, documentController.updateValidity);

module.exports = router;