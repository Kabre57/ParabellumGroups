const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const demandeAchatController = require('../controllers/demandeAchat.controller');
const authMiddleware = require('../middleware/auth');

// Validation rules
const validateDemandeAchat = [
  body('titre').notEmpty().withMessage('Le titre est requis'),
  body('demandeurId').notEmpty().withMessage('Le demandeur est requis')
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/', demandeAchatController.getAll);
router.post('/', validateDemandeAchat, demandeAchatController.create);
router.get('/stats', demandeAchatController.getStats);
router.get('/:id', demandeAchatController.getById);
router.put('/:id', validateDemandeAchat, demandeAchatController.update);
router.patch('/:id/approve', demandeAchatController.approve);
router.patch('/:id/reject', demandeAchatController.reject);
router.delete('/:id', demandeAchatController.delete);

module.exports = router;
