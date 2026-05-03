const { PrismaClient } = require('@prisma/client');
const { ensureAccountingReadAccess, ensureAccountingWriteAccess } = require('../utils/accounting');
const AccountingDiagnosticService = require('../core/services/AccountingDiagnosticService');

const prisma = new PrismaClient();

exports.getDiagnosticRuns = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const enterpriseId = req.user?.enterpriseId;
    const runs = await prisma.accountingDiagnosticRun.findMany({
      where: enterpriseId ? { enterpriseId: Number(enterpriseId) } : {},
      include: {
        issues: {
          orderBy: [{ severity: 'asc' }, { issueType: 'asc' }],
        },
      },
      orderBy: [{ runDate: 'desc' }],
      take: req.query.limit ? Number(req.query.limit) : 20,
    });
    return res.json({ success: true, data: runs });
  } catch (error) {
    console.error('Erreur récupération diagnostics comptables:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des diagnostics comptables' });
  }
};

exports.runDiagnostic = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de lancer un diagnostic comptable');
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const run = await AccountingDiagnosticService.runDiagnostic(undefined, {
      scope: req.body?.scope || 'GLOBAL',
      enterpriseId: req.user?.enterpriseId,
      createdByUserId: req.user?.userId || req.user?.id,
    });
    return res.status(201).json({ success: true, data: run });
  } catch (error) {
    console.error('Erreur diagnostic comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Erreur lors du diagnostic comptable',
    });
  }
};
