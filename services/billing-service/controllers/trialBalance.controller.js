const TrialBalanceService = require('../core/services/TrialBalanceService');
const { hasPermission, isAdminUser } = require('../utils/accounting');

/**
 * Contrôleur pour la Balance Générale (Trial Balance).
 * Route : GET /api/accounting/trial-balance
 */

exports.getTrialBalance = async (req, res) => {
  try {
    // Vérification des permissions : lecture des rapports comptables
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'accounting.reports.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante pour consulter la balance générale.' });
    }

    const { periodId, fiscalYearId, enterpriseId, startDate, endDate } = req.query;
    const resolvedEnterpriseId = isAdminUser(req.user) ? (enterpriseId || req.user.enterpriseId) : req.user.enterpriseId;

    const data = await TrialBalanceService.generateTrialBalance({ 
      periodId, 
      fiscalYearId, 
      enterpriseId: resolvedEnterpriseId,
      startDate,
      endDate
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('[TrialBalance] Erreur:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
