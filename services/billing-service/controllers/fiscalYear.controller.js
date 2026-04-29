const { PrismaClient } = require('@prisma/client');
const {
  ensureAccountingReadAccess,
  ensureAccountingWriteAccess,
} = require('../utils/accounting');

const prisma = new PrismaClient();

exports.getFiscalYears = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const years = await prisma.fiscalYear.findMany({
      orderBy: [{ startDate: 'desc' }],
      include: {
        periods: {
          orderBy: [{ startDate: 'asc' }],
        },
      },
    });

    return res.json({ success: true, data: years });
  } catch (error) {
    console.error('Erreur récupération exercices comptables:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des exercices comptables' });
  }
};

exports.createFiscalYear = async (req, res) => {
  try {
    const accessError = ensureAccountingWriteAccess(req, 'Vous n avez pas la permission de créer un exercice comptable');
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const { code, label, startDate, endDate, status } = req.body;
    if (!code || !label || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Le code, le libellé et les dates sont obligatoires.' });
    }

    const fiscalYear = await prisma.fiscalYear.create({
      data: {
        code: String(code).trim().toUpperCase(),
        label: String(label).trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'OPEN',
      },
    });

    return res.status(201).json({ success: true, data: fiscalYear });
  } catch (error) {
    console.error('Erreur création exercice comptable:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création de l exercice comptable' });
  }
};
