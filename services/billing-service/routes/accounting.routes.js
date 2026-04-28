const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const accountingOverviewController = require('../controllers/accountingOverview.controller');
const accountingBalanceController = require('../controllers/accountingBalance.controller');
const accountRoutes = require('./account.routes');
const journalEntryRoutes = require('./journalEntry.routes');

const router = express.Router();

router.use(authenticateToken);

router.get('/overview', accountingOverviewController.getAccountingOverview);
router.get('/balance', accountingBalanceController.getAccountingBalance);
router.use('/accounts', accountRoutes);
router.use('/entries', journalEntryRoutes);

module.exports = router;
