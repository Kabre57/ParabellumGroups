const {
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
} = require('../utils/accounting');
const { resolveEnterpriseIdsForRequest, resolveEnterpriseContext } = require('../utils/enterpriseScope');
const AccountingJournalService = require('../core/services/AccountingJournalService');

exports.getAccountingJournals = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const enterpriseIds = await resolveEnterpriseIdsForRequest(req, req.query?.enterpriseId);
    const journals = await AccountingJournalService.listJournals(enterpriseIds);
    return res.json({ success: true, data: journals });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Erreur récupération journaux comptables:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des journaux comptables' });
  }
};

exports.createAccountingJournal = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de créer un journal comptable');
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const { code, label, type, description, enterpriseId: requestedEnterpriseId, isActive } = req.body;
    if (!code || !label) {
      return res.status(400).json({ success: false, message: 'Le code et le libellé du journal sont obligatoires.' });
    }

    const enterprise = await resolveEnterpriseContext(req, requestedEnterpriseId);
    if (!enterprise.enterpriseId) {
      return res.status(400).json({ success: false, message: 'Sélectionnez une entreprise active avant de créer un journal.' });
    }

    const journal = await AccountingJournalService.createJournal(undefined, {
      code: String(code).trim().toUpperCase(),
      label: String(label).trim(),
      type: type ? String(type).trim().toUpperCase() : undefined,
      description: description ? String(description).trim() : null,
      enterpriseId: enterprise.enterpriseId,
      isActive: isActive !== false,
    });

    return res.status(201).json({ success: true, data: journal });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Erreur création journal comptable:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création du journal comptable' });
  }
};
