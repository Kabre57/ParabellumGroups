const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const congeController = require('../controllers/conge.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const createValidation = [
  body('employeId').notEmpty().withMessage('L\'ID de l\'employé est requis'),
  body('typeConge').isIn(['ANNUEL', 'MALADIE', 'SANS_SOLDE', 'PARENTAL']).withMessage('Type de congé invalide'),
  body('dateDebut').isISO8601().withMessage('Date de début invalide'),
  body('dateFin').isISO8601().withMessage('Date de fin invalide'),
  body('nbJours').isInt({ min: 1 }).withMessage('Le nombre de jours doit être supérieur à 0')
];

const updateValidation = [
  body('typeConge').optional().isIn(['ANNUEL', 'MALADIE', 'SANS_SOLDE', 'PARENTAL']).withMessage('Type de congé invalide'),
  body('dateDebut').optional().isISO8601().withMessage('Date de début invalide'),
  body('dateFin').optional().isISO8601().withMessage('Date de fin invalide'),
  body('nbJours').optional().isInt({ min: 1 }).withMessage('Le nombre de jours doit être supérieur à 0')
];

// Routes
router.get('/', authMiddleware, congeController.getAll);
router.get('/calendrier', authMiddleware, congeController.getCalendrier);
router.get('/:id', authMiddleware, congeController.getById);
router.get('/solde/:employeId', authMiddleware, congeController.getSoldeConge);
router.post('/', authMiddleware, createValidation, congeController.create);
router.put('/:id', authMiddleware, updateValidation, congeController.update);
router.delete('/:id', authMiddleware, congeController.delete);
router.patch('/:id/approve', authMiddleware, congeController.approve);
router.patch('/:id/reject', authMiddleware, congeController.reject);

module.exports = router;
