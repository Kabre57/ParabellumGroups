const { hasPermission, isAdminUser } = require('../utils/accounting');
const generalLedgerService = require('../services/generalLedger.service');

exports.getGeneralLedger = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'accounting.read', 'reports.read_financial')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de consulter le grand livre',
      });
    }

    const data = await generalLedgerService.getGeneralLedger(req, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      enterpriseId: req.query.enterpriseId,
      accountId: req.query.accountId,
      includeDraft: req.query.includeDraft,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erreur récupération grand livre:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Erreur lors de la génération du grand livre',
    });
  }
};
