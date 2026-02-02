const express = require('express');
const { body, query } = require('express-validator');
const interactionController = require('../controllers/interaction.controller');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('type').isIn(['APPEL', 'EMAIL', 'REUNION', 'VISITE', 'SUPPORT', 'COMMERCIAL', 'TECHNIQUE', 'FORMATION', 'DEMONSTRATION', 'PRESENTATION', 'NEGOCIATION']).withMessage('Type d\'interaction invalide'),
  body('canal').isIn(['TELEPHONE', 'EMAIL', 'EN_PERSONNE', 'VIDEO', 'CHAT', 'RESEAUX_SOCIAUX', 'PORTAL_CLIENT', 'MOBILE']).withMessage('Canal d\'interaction invalide'),
  body('sujet').notEmpty().trim().withMessage('Le sujet est requis'),
  body('description').optional().isString().withMessage('La description doit être une chaîne de caractères'),
  body('dateInteraction').optional().isISO8601().withMessage('Date d\'interaction invalide'),
  body('dureeMinutes').optional().isInt({ min: 1 }).withMessage('La durée doit être un nombre positif')
];

const updateValidation = [
  body('type').optional().isIn(['APPEL', 'EMAIL', 'REUNION', 'VISITE', 'SUPPORT', 'COMMERCIAL', 'TECHNIQUE', 'FORMATION', 'DEMONSTRATION', 'PRESENTATION', 'NEGOCIATION']).withMessage('Type d\'interaction invalide'),
  body('canal').optional().isIn(['TELEPHONE', 'EMAIL', 'EN_PERSONNE', 'VIDEO', 'CHAT', 'RESEAUX_SOCIAUX', 'PORTAL_CLIENT', 'MOBILE']).withMessage('Canal d\'interaction invalide'),
  body('sujet').optional().notEmpty().trim().withMessage('Le sujet ne peut pas être vide'),
  body('description').optional().isString().withMessage('La description doit être une chaîne de caractères'),
  body('resultat').optional().isIn(['POSITIF', 'NEUTRE', 'NEGATIF', 'A_RELANCER', 'A_SUIVRE', 'TERMINE', 'REPORTE', 'ANNULE']).withMessage('Résultat invalide')
];

const taskLinkValidation = [
  body('tacheId').notEmpty().withMessage('L\'ID de la tâche est requis')
];

// Query validation
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit être un nombre positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
  query('type').optional().isIn(['APPEL', 'EMAIL', 'REUNION', 'VISITE', 'SUPPORT', 'COMMERCIAL', 'TECHNIQUE', 'FORMATION', 'DEMONSTRATION', 'PRESENTATION', 'NEGOCIATION']).withMessage('Type d\'interaction invalide'),
  query('canal').optional().isIn(['TELEPHONE', 'EMAIL', 'EN_PERSONNE', 'VIDEO', 'CHAT', 'RESEAUX_SOCIAUX', 'PORTAL_CLIENT', 'MOBILE']).withMessage('Canal d\'interaction invalide'),
  query('resultat').optional().isIn(['POSITIF', 'NEUTRE', 'NEGATIF', 'A_RELANCER', 'A_SUIVRE', 'TERMINE', 'REPORTE', 'ANNULE']).withMessage('Résultat invalide')
];

// Routes
router.get('/', authMiddleware, queryValidation, interactionController.getAll);
router.post('/', authMiddleware, createValidation, interactionController.create);
router.get('/stats', authMiddleware, interactionController.getStats);
router.get('/:id', authMiddleware, interactionController.getById);
router.put('/:id', authMiddleware, updateValidation, interactionController.update);
router.delete('/:id', authMiddleware, interactionController.delete);
router.patch('/:id/link-task', authMiddleware, taskLinkValidation, interactionController.linkToTask);

module.exports = router;