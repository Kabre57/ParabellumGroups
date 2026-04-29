const express = require('express');
const controller = require('../controllers/accountingPeriod.controller');

const router = express.Router();

router.get('/', controller.getAccountingPeriods);
router.post('/', controller.createAccountingPeriod);
router.patch('/:id/status', controller.updateAccountingPeriodStatus);

module.exports = router;
