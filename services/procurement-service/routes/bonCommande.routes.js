const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bonCommandeController = require('../controllers/bonCommande.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const validateCreateBonCommande = [
  body('fournisseurId').notEmpty().withMessage('Le fournisseur est requis'),
  body('montantTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant total doit être supérieur ou égal à 0')
];

const validateUpdateBonCommande = [
  body('fournisseurId')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Le fournisseur est invalide'),
  body('montantTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant total doit être supérieur ou égal à 0'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant est invalide'),
  body('status')
    .optional()
    .isIn(['BROUILLON', 'ENVOYE', 'CONFIRME', 'LIVRE', 'ANNULE'])
    .withMessage('Le statut est invalide'),
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/', bonCommandeController.getAll);
router.get('/validations', bonCommandeController.getValidationHistory);
router.post('/', validateCreateBonCommande, bonCommandeController.create);
router.get('/fournisseur/:fournisseurId', bonCommandeController.getByFournisseur);
router.get('/:id/validations', bonCommandeController.getValidationLogs);
router.get('/:id', bonCommandeController.getById);
router.put('/:id', validateUpdateBonCommande, bonCommandeController.update);
router.post('/:id/lignes', bonCommandeController.addLigne);
router.patch('/:id/status', bonCommandeController.updateStatus);
router.delete('/:id', bonCommandeController.delete);

module.exports = router;
