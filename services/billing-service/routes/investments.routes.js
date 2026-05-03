const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const portfolioCtrl = require('../controllers/investmentPortfolio.controller');
const transactionCtrl = require('../controllers/investmentTransaction.controller');
const analyticsCtrl = require('../controllers/investmentAnalytics.controller');
const cashflowAlertCtrl = require('../controllers/investmentCashflowAlert.controller');

const router = express.Router();
router.use(authenticateToken);

// ─── PORTEFEUILLES ──────────────────────────────────────────────────────────
router.get('/portfolios', portfolioCtrl.listPortfolios);
router.post('/portfolios', portfolioCtrl.createPortfolio);
router.get('/portfolios/:id', portfolioCtrl.getPortfolioById);
router.get('/portfolios/:id/summary', portfolioCtrl.getPortfolioSummary);
router.patch('/portfolios/:id', portfolioCtrl.updatePortfolio);

// ─── VALORISATION / PERFORMANCE / RISQUE (par portefeuille) ─────────────────
router.post('/portfolios/:id/valuate', analyticsCtrl.runValuation);
router.get('/portfolios/:id/performance', analyticsCtrl.getPerformance);
router.get('/portfolios/:id/risk', analyticsCtrl.getRiskMetrics);
router.get('/portfolios/:id/asset-performance/:assetId', analyticsCtrl.getAssetPerformance);

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────
router.get('/transactions', transactionCtrl.listTransactions);
router.post('/transactions', transactionCtrl.recordTransaction);
router.post('/transactions/:id/validate', transactionCtrl.validateTransaction);
router.post('/transactions/:id/post-accounting', transactionCtrl.postAccountingEntry);

// ─── CASH-FLOWS ──────────────────────────────────────────────────────────────
router.get('/cashflows', cashflowAlertCtrl.listCashflows);
router.post('/cashflows/generate', cashflowAlertCtrl.generateCashflows);
router.post('/cashflows/:id/receive', cashflowAlertCtrl.receiveCashflow);

// ─── ALERTES ─────────────────────────────────────────────────────────────────
router.get('/alerts', cashflowAlertCtrl.listAlerts);
router.post('/alerts/check-maturities', cashflowAlertCtrl.checkMaturities);
router.post('/alerts/:id/dismiss', cashflowAlertCtrl.dismissAlert);

module.exports = router;
