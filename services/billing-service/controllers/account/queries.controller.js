// Liste les comptes comptables de l’entreprise courante.
const { applyEnterpriseScope, ensureAccountingReadAccess, prisma, serializeAccountingAccount } = require('./shared');

exports.getAllAccounts = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const accounts = await prisma.accountingAccount.findMany({
      where: await applyEnterpriseScope({
        req,
        where: { isActive: true },
      }),
      orderBy: [{ code: 'asc' }],
    });

    return res.json({
      success: true,
      data: accounts.map(serializeAccountingAccount),
    });
  } catch (error) {
    console.error('Erreur récupération plan comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du plan comptable',
    });
  }
};
