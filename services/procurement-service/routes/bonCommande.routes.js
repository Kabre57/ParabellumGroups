const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bonCommandeController = require('../controllers/bonCommande.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const validateBonCommande = [
  body('fournisseurId').notEmpty().withMessage('Le fournisseur est requis'),
  body('montantTotal').isFloat({ min: 0 }).withMessage('Le montant total doit être supérieur ou égal à 0')
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/', bonCommandeController.getAll);
router.get('/validations', bonCommandeController.getValidationHistory);
router.post('/', validateBonCommande, bonCommandeController.create);
router.get('/fournisseur/:fournisseurId', bonCommandeController.getByFournisseur);
router.get('/:id/validations', bonCommandeController.getValidationLogs);
router.get('/:id', bonCommandeController.getById);
router.put('/:id', validateBonCommande, bonCommandeController.update);
router.post('/:id/lignes', bonCommandeController.addLigne);
router.patch('/:id/status', bonCommandeController.updateStatus);
router.delete('/:id', bonCommandeController.delete);

module.exports = router;
