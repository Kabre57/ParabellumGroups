const express = require('express');
const router = express.Router();
const devisController = require('../controllers/devis.controller');
const { authenticateToken } = require('../middleware/auth');

// Routes protégées par authentification
router.use(authenticateToken);

// Routes CRUD devis
router.get('/', devisController.getAllDevis);
router.get('/:id', devisController.getDevisById);
router.post('/', devisController.createDevis);
router.put('/:id', devisController.updateDevis);
router.delete('/:id', devisController.deleteDevis);

// Routes spécifiques
router.post('/:id/lignes', devisController.addLigne);
router.post('/:id/accept', devisController.acceptDevis);
router.post('/:id/refuse', devisController.refuseDevis);
router.post('/:id/convert-to-facture', devisController.convertToFacture);
router.post('/:id/send', devisController.sendDevis);
router.get('/:id/pdf', devisController.generatePDF);

module.exports = router;
