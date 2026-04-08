const express = require('express');
const router = express.Router();
const accountingOverviewController = require('../controllers/accountingOverview.controller');

// Redirige l'ancienne route de synthèse vers le nouveau contrôleur d'overview
router.get('/spending-overview', accountingOverviewController.getAccountingOverview);

module.exports = router;
