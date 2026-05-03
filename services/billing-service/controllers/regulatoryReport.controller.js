const RegulatoryReportService = require('../core/services/RegulatoryReportService');
const { hasPermission, isAdminUser } = require('../utils/accounting');

/**
 * Contrôleur pour les Rapports Réglementaires.
 * Routes :
 *   POST /api/accounting/regulatory-reports/syscoa  → générer le rapport SYSCOA
 *   GET  /api/accounting/regulatory-reports/snapshots → lister les snapshots existants
 */

/**
 * Génère un rapport réglementaire SYSCOA pour un exercice.
 * Corps attendu : { fiscalYearId, enterpriseId? }
 */
exports.generateSyscoaReport = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'accounting.reports.export')) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante pour générer un rapport réglementaire.' });
    }

    const { fiscalYearId, enterpriseId } = req.body;
    if (!fiscalYearId) {
      return res.status(400).json({ success: false, message: 'fiscalYearId est requis.' });
    }

    const data = await RegulatoryReportService.generateSyscoaReport(fiscalYearId, enterpriseId);

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[RegulatoryReport] Erreur génération SYSCOA:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
