const express = require('express');
const { body, query } = require('express-validator');
const secteurController = require('../controllers/secteur.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createValidation = [
  body('libelle').notEmpty().trim().withMessage('Le libellé est requis'),
  body('codeNAF').optional().matches(/^\d{2}\.\d{2}[A-Z]$/).withMessage('Format code NAF invalide (ex: 62.01Z)'),
  body('description').optional().isString().withMessage('La description doit être une chaîne de caractères'),
  body('parentId').optional().isString().withMessage('L\'ID parent doit être une chaîne de caractères')
];

const updateValidation = [
  body('libelle').optional().notEmpty().trim().withMessage('Le libellé ne peut pas être vide'),
  body('codeNAF').optional().matches(/^\d{2}\.\d{2}[A-Z]$/).withMessage('Format code NAF invalide (ex: 62.01Z)'),
  body('description').optional().isString().withMessage('La description doit être une chaîne de caractères'),
  body('parentId').optional().isString().withMessage('L\'ID parent doit être une chaîne de caractères')
];

// Query validation
const queryValidation = [
  query('parentId').optional().isString().withMessage('L\'ID parent doit être une chaîne de caractères'),
  query('niveau').optional().isInt({ min: 1 }).withMessage('Le niveau doit être un nombre positif')
];

// Routes
router.get('/', authMiddleware, queryValidation, secteurController.getAll);
router.get('/tree', authMiddleware, secteurController.getTree);
router.post('/', authMiddleware, requireManager, createValidation, secteurController.create);
router.get('/:id', authMiddleware, secteurController.getById);
router.put('/:id', authMiddleware, requireManager, updateValidation, secteurController.update);
router.delete('/:id', authMiddleware, requireManager, secteurController.delete);

module.exports = router;