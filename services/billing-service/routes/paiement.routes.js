const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiement.controller');
const { authenticateToken } = require('../middleware/auth');

// Routes protégées par authentification
router.use(authenticateToken);

// Routes paiements
router.get('/', paiementController.getAllPaiements);
router.post('/', paiementController.createPaiement);
router.get('/facture/:factureId', paiementController.getByFacture);
router.get('/facture/:factureId/total', paiementController.getTotal);
router.delete('/:id', paiementController.deletePaiement);

module.exports = router;
