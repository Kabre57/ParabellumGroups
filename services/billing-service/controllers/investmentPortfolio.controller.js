const InvestmentPortfolioService = require('../core/services/InvestmentPortfolioService');
const { hasPermission, isAdminUser } = require('../utils/accounting');

/**
 * Contrôleur pour la gestion des Portefeuilles de Placements.
 * Routes :
 *   GET    /api/investments/portfolios
 *   POST   /api/investments/portfolios
 *   GET    /api/investments/portfolios/:id
 *   GET    /api/investments/portfolios/:id/summary
 *   PATCH  /api/investments/portfolios/:id
 */

/** Liste tous les portefeuilles avec filtres optionnels. */
exports.listPortfolios = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const enterpriseId = req.user?.enterpriseId || req.query.enterpriseId;
    const { status } = req.query;
    const data = await InvestmentPortfolioService.listPortfolios({ 
      enterpriseId: enterpriseId ? Number(enterpriseId) : null, 
      status 
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Portfolio] listPortfolios:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Crée un nouveau portefeuille. */
exports.createPortfolio = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentPortfolioService.createPortfolio({
      ...req.body,
      enterpriseId: req.user?.enterpriseId || req.body.enterpriseId
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[Portfolio] createPortfolio:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Récupère un portefeuille par son ID. */
exports.getPortfolioById = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const enterpriseId = req.user?.enterpriseId;
    const data = await InvestmentPortfolioService.getPortfolioById(req.params.id, enterpriseId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Portfolio] getPortfolioById:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Retourne la vue synthétique du portefeuille (positions + totaux + répartition). */
exports.getPortfolioSummary = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const enterpriseId = req.user?.enterpriseId;
    const data = await InvestmentPortfolioService.getPortfolioSummary(req.params.id, enterpriseId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Portfolio] getPortfolioSummary:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Met à jour les informations d'un portefeuille. */
exports.updatePortfolio = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const enterpriseId = req.user?.enterpriseId;
    // We check existence and ownership before update
    await InvestmentPortfolioService.getPortfolioById(req.params.id, enterpriseId);
    const data = await InvestmentPortfolioService.updatePortfolio(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Portfolio] updatePortfolio:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
