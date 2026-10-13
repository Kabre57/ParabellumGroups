// Enregistre les comptes après vérification du plan comptable.
const { amount, getAccountImportAccessError, getDynamicAccountTemplate, parseAccountingAccountWorkbook, prisma, requireActiveEnterpriseForImport, validateAccountingAccountImport } = require('./shared');

exports.importAccountingAccounts = async (req, res) => {
  try {
    const accessError = getAccountImportAccessError(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const enterprise = await requireActiveEnterpriseForImport(req);
    const parsedRows = parseAccountingAccountWorkbook(req.file, req.body?.corrections);
    const preview = await validateAccountingAccountImport(parsedRows, enterprise.enterpriseId);
    const rowsToImport = preview.rows.filter((row) => row.status === 'IMPORTABLE');
    if (!rowsToImport.length) {
      return res.status(400).json({
        success: false,
        message: 'Aucun compte importable : corrigez les lignes invalides ou utilisez une entreprise sans ces codes.',
        data: { summary: preview.summary, rows: preview.rows },
      });
    }

    const importResult = await prisma.$transaction(async (tx) => {
      const codes = rowsToImport.map((row) => row.code);
      const existingNow = await tx.accountingAccount.findMany({
        where: { enterpriseId: enterprise.enterpriseId, code: { in: codes } },
        select: { code: true },
      });
      const existingCodes = new Set(existingNow.map((account) => account.code));
      const freshRows = rowsToImport.filter((row) => !existingCodes.has(row.code));
      const inserted = freshRows.length
        ? await tx.accountingAccount.createMany({
            skipDuplicates: true,
            data: freshRows.map((row) => {
              const openingBalance = amount(row.openingBalance);
              const dynamicTemplate = getDynamicAccountTemplate(row.code);
              return {
                code: row.code,
                label: row.label,
                type: row.type,
                description: row.description,
                openingBalance,
                currentBalance: openingBalance,
                isDynamic: Boolean(dynamicTemplate),
                formula: dynamicTemplate?.formula || null,
                enterpriseId: enterprise.enterpriseId,
                createdByUserId: req.user?.userId ? String(req.user.userId) : null,
                createdByEmail: req.user?.email || null,
              };
            }),
          })
        : { count: 0 };

      return {
        imported: inserted.count,
        skippedExistingAtImport: codes.length - inserted.count,
      };
    });

    const skippedExisting = preview.summary.existing + importResult.skippedExistingAtImport;
    return res.status(201).json({
      success: true,
      message: `Import terminé : ${importResult.imported} compte(s) ajouté(s).`,
      data: {
        enterpriseName: enterprise.enterpriseName,
        imported: importResult.imported,
        skippedExisting,
        skippedInvalid: preview.summary.invalid,
        existingCodes: preview.rows.filter((row) => row.status === 'EXISTING').map((row) => row.code),
        errors: preview.rows.filter((row) => row.status === 'INVALID').map(({ line, code, errors }) => ({ line, code, errors })),
      },
    });
  } catch (error) {
    console.error('Erreur import plan comptable:', error.message);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec ce code a été ajouté pendant l’import. Relancez l’aperçu avant de réessayer.',
      });
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de l’import du plan comptable.',
    });
  }
};
