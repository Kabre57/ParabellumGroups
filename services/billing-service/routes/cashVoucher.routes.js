const express = require('express');
const multer = require('multer');
const router = express.Router();
const cashVoucherController = require('../controllers/cashVoucher.controller');
const { authenticateToken } = require('../middleware/auth');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

// Liste et filtres
router.get('/', cashVoucherController.getAllCashVouchers);

// Création
router.post('/', cashVoucherController.createCashVoucher);
router.post('/import', upload.single('file'), cashVoucherController.importCashVouchers);

// Mise à jour de statut (validation/décaissement)
router.patch('/:id/status', cashVoucherController.updateCashVoucherStatus);

// Vue consolidée des dépenses
router.get('/spending-overview', cashVoucherController.getSpendingOverview);

module.exports = router;
