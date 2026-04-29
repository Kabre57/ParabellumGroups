const {
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
} = require('../utils/accounting');
const AccountingPeriodService = require('../core/services/AccountingPeriodService');

exports.getAccountingPeriods = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const periods = await AccountingPeriodService.listPeriods(undefined, req.query.fiscalYearId);
    return res.json({ success: true, data: periods });
  } catch (error) {
    console.error('Erreur récupération périodes comptables:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des périodes comptables' });
  }
};

exports.createAccountingPeriod = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de créer une période comptable');
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const { fiscalYearId, code, label, startDate, endDate, periodType, status } = req.body;
    if (!fiscalYearId || !code || !label || !startDate || !endDate || !periodType) {
      return res.status(400).json({ success: false, message: 'Exercice, code, libellé, dates et type de période sont obligatoires.' });
    }

    const period = await AccountingPeriodService.createPeriod(undefined, {
      fiscalYearId: String(fiscalYearId),
      code: String(code).trim().toUpperCase(),
      label: String(label).trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      periodType: String(periodType).trim().toUpperCase(),
      status: status || 'OPEN',
    });

    return res.status(201).json({ success: true, data: period });
  } catch (error) {
    console.error('Erreur création période comptable:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création de la période comptable' });
  }
};

exports.updateAccountingPeriodStatus = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de mettre à jour une période comptable');
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Le statut de période est obligatoire.' });
    }

    const period = await AccountingPeriodService.updatePeriodStatus(undefined, req.params.id, status, req.user?.userId);
    return res.json({ success: true, data: period });
  } catch (error) {
    console.error('Erreur mise à jour période comptable:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Erreur lors de la mise à jour de la période comptable' });
  }
};
