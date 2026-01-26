const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const evaluationController = require('../controllers/evaluation.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const createValidation = [
  body('employeId').notEmpty().withMessage('L\'ID de l\'employé est requis'),
  body('evaluateurId').notEmpty().withMessage('L\'ID de l\'évaluateur est requis'),
  body('dateEvaluation').isISO8601().withMessage('Date d\'évaluation invalide'),
  body('periode').notEmpty().withMessage('La période est requise'),
  body('noteGlobale').isFloat({ min: 0, max: 5 }).withMessage('La note globale doit être entre 0 et 5'),
  body('competences').isObject().withMessage('Les compétences doivent être un objet JSON')
];

const updateValidation = [
  body('dateEvaluation').optional().isISO8601().withMessage('Date d\'évaluation invalide'),
  body('periode').optional().notEmpty().withMessage('La période ne peut pas être vide'),
  body('noteGlobale').optional().isFloat({ min: 0, max: 5 }).withMessage('La note globale doit être entre 0 et 5'),
  body('competences').optional().isObject().withMessage('Les compétences doivent être un objet JSON')
];

// Routes
router.get('/', authMiddleware, evaluationController.getAll);
router.get('/employe/:employeId', authMiddleware, evaluationController.getByEmploye);
router.get('/:id', authMiddleware, evaluationController.getById);
router.post('/', authMiddleware, createValidation, evaluationController.create);
router.put('/:id', authMiddleware, updateValidation, evaluationController.update);
router.delete('/:id', authMiddleware, evaluationController.delete);

module.exports = router;
