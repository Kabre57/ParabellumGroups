const express = require('express');
const { body, query } = require('express-validator');
const typeClientController = require('../controllers/typeClient.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('code').notEmpty().trim().withMessage('Le code est requis'),
  body('libelle').notEmpty().trim().withMessage('Le libellé est requis'),
  body('couleur').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Couleur invalide (format hexadécimal: #RRGGBB)'),
  body('ordre').optional().isInt().withMessage('L\'ordre doit être un nombre entier')
];

const updateValidation = [
  body('code').optional().notEmpty().trim().withMessage('Le code ne peut pas être vide'),
  body('libelle').optional().notEmpty().trim().withMessage('Le libellé ne peut pas être vide'),
  body('couleur').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Couleur invalide (format hexadécimal: #RRGGBB)'),
  body('ordre').optional().isInt().withMessage('L\'ordre doit être un nombre entier'),
  body('isActive').optional().isBoolean().withMessage('Le statut actif doit être un booléen')
];

// Query validation
const queryValidation = [
  query('isActive').optional().isBoolean().withMessage('Le paramètre isActive doit être un booléen')
];

// Routes
router.get('/', authMiddleware, queryValidation, typeClientController.getAll);
router.post('/', authMiddleware, requireManager, createValidation, typeClientController.create);
router.get('/:id', authMiddleware, typeClientController.getById);
router.put('/:id', authMiddleware, requireManager, updateValidation, typeClientController.update);
router.delete('/:id', authMiddleware, requireManager, typeClientController.delete);
router.patch('/:id/toggle-active', authMiddleware, requireManager, typeClientController.toggleActive);

module.exports = router;