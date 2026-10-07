const GeneralLedgerService = require('../core/services/GeneralLedgerService');
const { hasPermission, isAdminUser } = require('../utils/accounting');
const { resolveEnterpriseIdsForRequest, resolveEnterpriseContext } = require('../utils/enterpriseScope');

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
    const activeEnterprise = await resolveEnterpriseContext(req, enterpriseId);
    if (!activeEnterprise.enterpriseId) {
      return res.status(400).json({ success: false, message: 'Choisissez une entreprise active pour consulter le grand livre.' });
    }
    const enterpriseIds = await resolveEnterpriseIdsForRequest(req, enterpriseId);

    console.log('[GeneralLedger] Request:', { periodId, fiscalYearId, enterpriseIds, startDate, endDate });

    // accountIds peut être passé comme chaîne séparée par des virgules
    const accountIdsArray = accountIds ? accountIds.split(',').map(id => id.trim()) : undefined;

    const inclusiveEndDate = endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ? `${endDate}T23:59:59.999Z`
      : endDate;
    const data = await GeneralLedgerService.generateLedger({ 
      periodId, 
      fiscalYearId, 
      enterpriseIds,
      accountIds: accountIdsArray,
      startDate,
      endDate: inclusiveEndDate
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
