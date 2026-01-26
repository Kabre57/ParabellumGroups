const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const fournisseurController = require('../controllers/fournisseur.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const validateFournisseur = [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('email').isEmail().withMessage('Email invalide')
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
