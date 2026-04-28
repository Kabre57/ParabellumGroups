const { hasPermission, isAdminUser } = require('../utils/accounting');
const accountingBalanceService = require('../services/accountingBalance.service');

exports.getAccountingBalance = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !hasPermission(req.user, 'reports.read_financial')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n avez pas la permission de consulter la balance des comptes',
      });
    }

    const data = await accountingBalanceService.getAccountingBalance(req, {
      scope: req.query.scope,
      enterpriseId: req.query.enterpriseId,
      groupBy: req.query.groupBy,
      includeZeroRows: req.query.includeZeroRows,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erreur récupération balance comptable:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 403
          ? error.message
          : 'Erreur lors de la génération de la balance comptable',
    });
  }
};
