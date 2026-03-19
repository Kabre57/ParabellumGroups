const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const cashVoucherController = require('../controllers/cashVoucher.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/', cashVoucherController.getAllCashVouchers);
router.post('/', cashVoucherController.createCashVoucher);
router.patch('/:id/status', cashVoucherController.updateCashVoucherStatus);
router.get('/spending-overview', cashVoucherController.getSpendingOverview);

module.exports = router;
