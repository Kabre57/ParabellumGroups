const { ensureAccountingReadAccess, ensureAccountingWriteAccess } = require('../utils/accounting');
const AccountingReportSnapshotService = require('../core/services/AccountingReportSnapshotService');

exports.getSnapshots = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const snapshots = await AccountingReportSnapshotService.listSnapshots(undefined, req.query);
    return res.json({ success: true, data: snapshots });
  } catch (error) {
    console.error('Erreur récupération snapshots comptables:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des snapshots comptables' });
  }
};

exports.createSnapshot = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de figer un rapport comptable');
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const snapshot = await AccountingReportSnapshotService.createSnapshot(undefined, {
      ...req.body,
      generatedByUserId: req.user?.userId,
    });
    return res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    console.error('Erreur création snapshot comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du snapshot comptable',
    });
  }
};
