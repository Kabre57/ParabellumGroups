const InvestmentValuationService = require('../core/services/InvestmentValuationService');
const InvestmentPerformanceService = require('../core/services/InvestmentPerformanceService');
const InvestmentRiskService = require('../core/services/InvestmentRiskService');
const { hasPermission, isAdminUser } = require('../utils/accounting');

/**
 * Contrôleur pour les Valorisations, Performance et Risque des Placements.
 * Routes :
 *   POST /api/investments/portfolios/:id/valuate
 *   GET  /api/investments/portfolios/:id/performance
 *   GET  /api/investments/portfolios/:id/risk
 *   GET  /api/investments/portfolios/:id/asset-performance/:assetId
 */

/** Lance la valorisation périodique d'un portefeuille. */
exports.runValuation = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.valuate')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante pour valoriser.' });
    }
    const { valuationDate, priceInputs } = req.body;
    if (!valuationDate) {
      return res.status(400).json({ success: false, message: 'valuationDate est requis.' });
    }
    const data = await InvestmentValuationService.runPeriodicValuation(
      req.params.id, valuationDate, priceInputs || {}
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[Valuation] runValuation:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Calcule et retourne les métriques de performance d'un portefeuille. */
exports.getPerformance = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentPerformanceService.calculateYield(req.params.id, req.query.asOfDate);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Performance] getPerformance:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Calcule et retourne les métriques de risque d'un portefeuille. */
exports.getRiskMetrics = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.risk.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentRiskService.calculateRiskMetrics(req.params.id, req.query.asOfDate);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Risk] getRiskMetrics:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Calcule le rendement d'un actif spécifique dans un portefeuille. */
exports.getAssetPerformance = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentPerformanceService.calculateAssetYield(req.params.assetId, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Performance] getAssetPerformance:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
