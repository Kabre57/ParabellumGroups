const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const fournisseurController = require('../controllers/fournisseur.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const validateFournisseur = [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email invalide'),
  body('rating').optional({ checkFalsy: true }).isFloat({ min: 0, max: 5 }).withMessage('La note doit etre comprise entre 0 et 5')
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/', fournisseurController.getAll);
router.post('/', validateFournisseur, fournisseurController.create);
router.get('/:id', fournisseurController.getById);
router.put('/:id', validateFournisseur, fournisseurController.update);
router.patch('/:id/rating', fournisseurController.updateRating);
router.get('/:id/stats', fournisseurController.getStats);
router.delete('/:id', fournisseurController.delete);

module.exports = router;
