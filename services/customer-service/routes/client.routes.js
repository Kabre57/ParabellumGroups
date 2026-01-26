const express = require('express');
const { body } = require('express-validator');
const clientController = require('../controllers/client.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('typeClient').isIn(['ENTREPRISE', 'PARTICULIER']).withMessage('Type de client invalide')
];

const updateValidation = [
  body('nom').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('typeClient').optional().isIn(['ENTREPRISE', 'PARTICULIER']).withMessage('Type de client invalide')
];

// Routes
router.get('/', authMiddleware, clientController.getAll);
router.post('/', authMiddleware, createValidation, clientController.create);
router.get('/:id', authMiddleware, clientController.getById);
router.put('/:id', authMiddleware, updateValidation, clientController.update);
router.patch('/:id/status', authMiddleware, clientController.updateStatus);

module.exports = router;
