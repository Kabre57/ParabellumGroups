const express = require('express');
const router = express.Router();
const factureController = require('../controllers/facture.controller');
const { authenticateToken } = require('../middleware/auth');

// Routes protégées par authentification
router.use(authenticateToken);

// Routes CRUD factures
router.get('/', factureController.getAllFactures);
router.get('/stats', factureController.getStats);
router.get('/retards', factureController.getRetards);
router.get('/:id', factureController.getFactureById);
router.post('/', factureController.createFacture);
router.put('/:id', factureController.updateFacture);
router.delete('/:id', factureController.deleteFacture);

// Routes spécifiques
router.post('/:id/lignes', factureController.addLigne);
router.post('/:id/send', factureController.sendFacture);
router.get('/:id/pdf', factureController.generatePDF);

module.exports = router;
