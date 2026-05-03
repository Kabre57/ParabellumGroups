const GeneralLedgerService = require('../core/services/GeneralLedgerService');
const { hasPermission, isAdminUser } = require('../utils/accounting');

/**
 * Contrôleur pour le Grand Livre (General Ledger) — version noyau persistant.
 * Route : GET /api/accounting/ledger
 *
 * Complète le generalLedger.controller.js existant qui lit un service legacy.
 * Celui-ci lit directement depuis AccountingJournalLine (journal persistant).
 */

exports.getLedger = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'accounting.reports.read')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante pour consulter le grand livre.' });
    }

    const { periodId, fiscalYearId, enterpriseId, accountIds, startDate, endDate } = req.query;
    const resolvedEnterpriseId = isAdminUser(req.user) ? (enterpriseId || req.user.enterpriseId) : req.user.enterpriseId;

    console.log('[GeneralLedger] Request:', { periodId, fiscalYearId, resolvedEnterpriseId, startDate, endDate });

    // accountIds peut être passé comme chaîne séparée par des virgules
    const accountIdsArray = accountIds ? accountIds.split(',').map(id => id.trim()) : undefined;

    const data = await GeneralLedgerService.generateLedger({ 
      periodId, 
      fiscalYearId, 
      enterpriseId: resolvedEnterpriseId, 
      accountIds: accountIdsArray,
      startDate,
      endDate
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('[GeneralLedger] Erreur critique:', error);
    return res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
};
