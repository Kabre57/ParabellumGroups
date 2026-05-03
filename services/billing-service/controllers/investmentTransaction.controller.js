const InvestmentTransactionService = require('../core/services/InvestmentTransactionService');
const InvestmentAccountingService = require('../core/services/InvestmentAccountingService');
const { hasPermission, isAdminUser } = require('../utils/accounting');

/**
 * Contrôleur pour les Transactions de Placements.
 * Routes :
 *   GET    /api/investments/transactions
 *   POST   /api/investments/transactions
 *   POST   /api/investments/transactions/:id/validate
 *   POST   /api/investments/transactions/:id/post-accounting
 */

/** Liste les transactions avec filtres. */
exports.listTransactions = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const enterpriseId = req.user?.enterpriseId || req.query.enterpriseId;
    const data = await InvestmentTransactionService.listTransactions({
      ...req.query,
      enterpriseId: enterpriseId ? Number(enterpriseId) : null
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[InvTransaction] listTransactions:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Enregistre une nouvelle transaction (achat, vente, coupon...). */
exports.recordTransaction = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const data = await InvestmentTransactionService.recordTransaction({
      ...req.body,
      createdByUserId: req.user?.userId || req.user?.id
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[InvTransaction] recordTransaction:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/** Valide une transaction (DRAFT → SETTLED). */
exports.validateTransaction = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.manage')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante.' });
    }
    const userId = req.user?.userId || req.user?.id;
    const data = await InvestmentTransactionService.validateTransaction(req.params.id, userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[InvTransaction] validateTransaction:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

/**
 * Comptabilise une transaction validée.
 * Nécessite la permission investments.accounting.post.
 */
exports.postAccountingEntry = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'investments.accounting.post')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante pour comptabiliser.' });
    }
    const meta = {
      userId: req.user?.userId || req.user?.id,
      enterpriseId: req.user?.enterpriseId || req.body?.enterpriseId || null,
      enterpriseName: req.user?.enterpriseName || req.body?.enterpriseName || null
    };
    const data = await InvestmentAccountingService.postTransactionAccounting(req.params.id, meta);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[InvTransaction] postAccounting:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
