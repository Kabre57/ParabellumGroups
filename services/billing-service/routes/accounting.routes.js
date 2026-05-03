const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const accountingOverviewController = require('../controllers/accountingOverview.controller');
const accountingBalanceController = require('../controllers/accountingBalance.controller');
const generalLedgerController = require('../controllers/generalLedger.controller');
const financialStatementController = require('../controllers/financialStatement.controller');
const trialBalanceController = require('../controllers/trialBalance.controller');
const ledgerController = require('../controllers/ledger.controller');
const regulatoryReportController = require('../controllers/regulatoryReport.controller');
const accountRoutes = require('./account.routes');
const accountingFamilyRuleRoutes = require('./accountingFamilyRule.routes');
const journalEntryRoutes = require('./journalEntry.routes');
const fiscalYearRoutes = require('./fiscalYear.routes');
const accountingPeriodRoutes = require('./accountingPeriod.routes');
const accountingJournalRoutes = require('./accountingJournal.routes');
const accountingClosingRoutes = require('./accountingClosing.routes');
const accountingDiagnosticRoutes = require('./accountingDiagnostic.routes');
const accountingReportSnapshotRoutes = require('./accountingReportSnapshot.routes');

const router = express.Router();

router.use(authenticateToken);

router.get('/overview', accountingOverviewController.getAccountingOverview);
router.get('/balance', accountingBalanceController.getAccountingBalance);
router.get('/general-ledger', generalLedgerController.getGeneralLedger);
router.get('/balance-sheet', financialStatementController.getBalanceSheet);
router.get('/income-statement', financialStatementController.getIncomeStatement);

// --- Routes avancées sur le journal persistant ---
router.get('/trial-balance', trialBalanceController.getTrialBalance);
router.get('/ledger', ledgerController.getLedger);
router.post('/regulatory-reports/syscoa', regulatoryReportController.generateSyscoaReport);
router.use('/fiscal-years', fiscalYearRoutes);
router.use('/periods', accountingPeriodRoutes);
router.use('/journals', accountingJournalRoutes);
router.use('/closings', accountingClosingRoutes);
router.use('/diagnostics', accountingDiagnosticRoutes);
router.use('/report-snapshots', accountingReportSnapshotRoutes);
router.use('/accounts', accountRoutes);
router.use('/family-rules', accountingFamilyRuleRoutes);
router.use('/entries', journalEntryRoutes);

module.exports = router;
