const {
  ensureAccountingReadAccess,
  resolveDateRange,
  resolveEnterpriseContext,
} = require('./shared');
const { loadAccountingOverviewData } = require('./queries');
const { calculateAccountingMetrics } = require('./metrics');
const { buildTreasuryOverview } = require('./movements');
const { buildAccountingEntries } = require('./entries');
const { buildAccountingOverviewResponse, buildAccountingReports } = require('./reports');

// Orchestre les modules de lecture et garde la gestion HTTP de la route /overview.
exports.getAccountingOverview = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const activeEnterprise = await resolveEnterpriseContext(req, req.query.enterpriseId);
    if (!activeEnterprise.enterpriseId) {
      return res.status(400).json({ success: false, message: 'Choisissez une entreprise active pour consulter la comptabilité.' });
    }

    const { startDate, endDate, periodLabel } = resolveDateRange({
      period: req.query.period,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    const data = await loadAccountingOverviewData({ req, startDate, endDate });
    const metrics = calculateAccountingMetrics(data);
    const treasury = await buildTreasuryOverview({ ...data, ...metrics });
    const entries = await buildAccountingEntries({ ...data, ...metrics, ...treasury });
    const accountingReports = buildAccountingReports({ ...metrics, ...treasury });

    return res.json(buildAccountingOverviewResponse({
      periodLabel,
      startDate,
      endDate,
      metrics,
      treasury,
      entries,
      accountingReports,
    }));
  } catch (error) {
    console.error('Erreur récupération overview comptable:', error);
    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode < 500 && error?.message
          ? error.message
          : 'Erreur lors de la génération de la vue comptable',
    });
  }
};
