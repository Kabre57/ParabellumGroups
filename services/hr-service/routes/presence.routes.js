const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const presenceController = require('../controllers/presence.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const createValidation = [
  body('employeId').notEmpty().withMessage('L\'ID de l\'employé est requis'),
  body('date').isISO8601().withMessage('Date invalide'),
  body('type').optional().isIn(['BUREAU', 'TELETRAVAIL', 'DEPLACEMENT', 'ABSENCE']).withMessage('Type de présence invalide')
];

// Routes
router.post('/', authMiddleware, createValidation, presenceController.create);
router.put('/:id', authMiddleware, presenceController.update);
router.get('/employe/:employeId', authMiddleware, presenceController.getByEmploye);
router.get('/stats', authMiddleware, presenceController.getStats);
router.get('/export', authMiddleware, presenceController.export);

module.exports = router;
