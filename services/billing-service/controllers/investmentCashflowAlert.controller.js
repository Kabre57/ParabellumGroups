const InvestmentCashflowService = require('../core/services/InvestmentCashflowService');
const InvestmentAlertService = require('../core/services/InvestmentAlertService');
const { hasPermission, isAdminUser } = require('../utils/accounting');

/**
 * Contrôleur pour les Cash-flows et Alertes de Placements.
 * Routes :
 *   GET  /api/investments/cashflows
 *   POST /api/investments/cashflows/generate
 *   POST /api/investments/cashflows/:id/receive
 *   GET  /api/investments/alerts
 *   POST /api/investments/alerts/check-maturities
 *   POST /api/investments/alerts/:id/dismiss
 */

/** Liste les flux attendus avec filtres. */
exports.listCashflows = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.cashflows.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentCashflowService.listCashflows(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Cashflow] list:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Génère les flux attendus pour un actif dans un portefeuille. */
exports.generateCashflows = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const { assetId, portfolioId } = req.body;
    if (!assetId || !portfolioId) {
      return res.status(400).json({ success: false, message: 'assetId et portfolioId sont requis.' });
    }
    const data = await InvestmentCashflowService.generateExpectedCashflows(assetId, portfolioId);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[Cashflow] generate:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Enregistre l'encaissement d'un flux. */
exports.receiveCashflow = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Le montant reçu doit être positif.' });
    }
    const data = await InvestmentCashflowService.receiveCashflow(req.params.id, Number(amount));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Cashflow] receive:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Liste les alertes actives. */
exports.listAlerts = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentAlertService.listAlerts(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Alert] list:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Lance la vérification des échéances proches (peut être appelé par un cron).
 * Corps attendu : { horizonDays?, portfolioId? }
 */
exports.checkMaturities = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const { horizonDays = 30, portfolioId } = req.body;
    const alerts = await InvestmentAlertService.checkMaturities(horizonDays, portfolioId || null);
    const overdueResult = await InvestmentAlertService.checkOverdueCashflows(portfolioId || null);
    return res.json({ success: true, data: { maturityAlerts: alerts, ...overdueResult } });
  } catch (error) {
    console.error('[Alert] checkMaturities:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Marque une alerte comme traitée. */
exports.dismissAlert = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentAlertService.dismissAlert(req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Alert] dismiss:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
