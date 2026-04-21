const express = require('express');
const router = express.Router();
const cashVoucherController = require('../controllers/cashVoucher.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Liste et filtres
router.get('/', cashVoucherController.getAllCashVouchers);

// Création
router.post('/', cashVoucherController.createCashVoucher);

// Mise à jour de statut (validation/décaissement)
router.patch('/:id/status', cashVoucherController.updateCashVoucherStatus);

// Vue consolidée des dépenses
router.get('/spending-overview', cashVoucherController.getSpendingOverview);

module.exports = router;
