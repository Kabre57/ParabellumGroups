const {
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
} = require('../utils/accounting');
const AccountingClosingService = require('../core/services/AccountingClosingService');

exports.getClosings = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const data = await AccountingClosingService.listClosings(undefined, {
      periodId: req.query.periodId,
      status: req.query.status,
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur récupération clôtures comptables:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des clôtures comptables' });
  }
};

exports.createClosing = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de créer une clôture comptable');
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const closing = await AccountingClosingService.createClosing(req, req.body);
    return res.status(201).json({ success: true, data: closing });
  } catch (error) {
    console.error('Erreur création clôture comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Erreur lors de la création de la clôture comptable',
    });
  }
};
