const express = require('express');
const { body } = require('express-validator');
const contratController = require('../controllers/contrat.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('titre').notEmpty().withMessage('Le titre est requis'),
  body('dateDebut').isISO8601().withMessage('Date de début invalide'),
  body('montant').isDecimal().withMessage('Le montant doit être un nombre valide')
];

// Routes
router.get('/', authMiddleware, contratController.getAll);
router.post('/', authMiddleware, createValidation, contratController.create);
router.get('/stats', authMiddleware, contratController.getStats);
router.get('/:id', authMiddleware, contratController.getById);
router.patch('/:id/status', authMiddleware, contratController.updateStatus);

module.exports = router;
