const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const employeController = require('../controllers/employe.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const createValidation = [
  body('matricule').notEmpty().withMessage('Le matricule est requis'),
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('dateEmbauche').isISO8601().withMessage('Date d\'embauche invalide'),
  body('poste').notEmpty().withMessage('Le poste est requis'),
  body('departement').notEmpty().withMessage('Le département est requis'),
  body('salaire').isNumeric().withMessage('Le salaire doit être un nombre')
];

const updateValidation = [
  body('nom').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('prenom').optional().notEmpty().withMessage('Le prénom ne peut pas être vide'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('salaire').optional().isNumeric().withMessage('Le salaire doit être un nombre')
];

// Routes
router.get('/', authMiddleware, employeController.getAll);
router.get('/stats', authMiddleware, employeController.getStats);
router.get('/departement/:departement', authMiddleware, employeController.getByDepartement);
router.get('/:id', authMiddleware, employeController.getById);
router.post('/', authMiddleware, createValidation, employeController.create);
router.put('/:id', authMiddleware, updateValidation, employeController.update);
router.delete('/:id', authMiddleware, employeController.delete);

module.exports = router;
