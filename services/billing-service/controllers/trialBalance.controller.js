const TrialBalanceService = require('../core/services/TrialBalanceService');
const { hasPermission, isAdminUser } = require('../utils/accounting');
const { resolveEnterpriseIdsForRequest, resolveEnterpriseContext } = require('../utils/enterpriseScope');

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
    const activeEnterprise = await resolveEnterpriseContext(req, enterpriseId);
    if (!activeEnterprise.enterpriseId) {
      return res.status(400).json({ success: false, message: 'Choisissez une entreprise active pour consulter la balance.' });
    }
    const enterpriseIds = await resolveEnterpriseIdsForRequest(req, enterpriseId);

    const data = await TrialBalanceService.generateTrialBalance({ 
      periodId, 
      fiscalYearId, 
      enterpriseIds,
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
