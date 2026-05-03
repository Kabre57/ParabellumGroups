const { ensureAccountingReadAccess } = require('../utils/accounting');
const FinancialStatementService = require('../core/services/FinancialStatementService');

const statementOptions = (req) => ({
  startDate: req.query.startDate,
  endDate: req.query.endDate,
  enterpriseId: req.query.enterpriseId,
  scope: req.query.scope,
  includeZeroRows: req.query.includeZeroRows,
});

exports.getBalanceSheet = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const data = await FinancialStatementService.getBalanceSheet(req, statementOptions(req));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur génération bilan:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Erreur lors de la génération du bilan',
    });
  }
};

exports.getIncomeStatement = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const data = await FinancialStatementService.getIncomeStatement(req, statementOptions(req));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur génération compte de résultat:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Erreur lors de la génération du compte de résultat',
    });
  }
};
