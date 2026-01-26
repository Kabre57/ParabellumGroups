const express = require('express');
const { body } = require('express-validator');
const contactController = require('../controllers/contact.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis')
];

const updateValidation = [
  body('nom').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('prenom').optional().notEmpty().withMessage('Le prénom ne peut pas être vide')
];

// Routes
router.get('/', authMiddleware, contactController.getAll);
router.post('/', authMiddleware, createValidation, contactController.create);
router.get('/:id', authMiddleware, contactController.getById);
router.put('/:id', authMiddleware, updateValidation, contactController.update);
router.delete('/:id', authMiddleware, contactController.delete);

module.exports = router;
