const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const accountingOverviewController = require('../controllers/accountingOverview.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/overview', accountingOverviewController.getAccountingOverview);

module.exports = router;
