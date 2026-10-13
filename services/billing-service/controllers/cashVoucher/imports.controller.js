// Gestion de l’import des bons de caisse.
const { assertEnterpriseInScope, resolveEnterpriseContext, XLSX, AccountingPostingService, prisma, hasPermission, ensureCreateAccess, normalizeFlowType, normalizeVoucherStatus, createImportedVoucherData, serializeCashVoucher } = require('./shared');

exports.importCashVouchers = async (req, res) => {
  try {
    const accessError = ensureCreateAccess(req);
    if (accessError && !hasPermission(req.user, 'expenses.import')) {
      return res.status(accessError.status).json(accessError.body);
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un fichier Excel a importer.',
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: 'Le fichier Excel ne contient aucune feuille exploitable.',
      });
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Le fichier Excel est vide.',
      });
    }

    const contextEnterprise = await resolveEnterpriseContext(req, req.body.enterpriseId);
    const defaultEnterpriseId = contextEnterprise.enterpriseId;
    const defaultEnterpriseName = contextEnterprise.enterpriseName || req.body.defaultEnterpriseName || req.user?.enterpriseName || null;
    const defaultFlowType = normalizeFlowType(req.body.defaultFlowType, 'DECAISSEMENT');
    const defaultStatus = normalizeVoucherStatus(req.body.defaultStatus, 'VALIDE');

    if (defaultEnterpriseId) {
      await assertEnterpriseInScope(req, defaultEnterpriseId, "Vous n'avez pas acces a l'entreprise selectionnee pour cet import.");
    }

    const imported = [];
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        const voucherData = await createImportedVoucherData({
          row,
          req,
          defaultEnterpriseId,
          defaultEnterpriseName,
          defaultFlowType,
          defaultStatus,
        });
        await AccountingPostingService.assertTreasuryAccountPeriodOpen(
          voucherData.treasuryAccountId,
          voucherData.disbursementDate || voucherData.issueDate || new Date()
        );
        const voucher = await prisma.cashVoucher.create({ data: voucherData });
        imported.push(serializeCashVoucher(voucher));
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error.message || "Erreur d'import sur la ligne.",
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Import des bons de caisse termine.',
      data: {
        imported: imported.length,
        skipped: errors.length,
        errors,
        vouchers: imported,
      },
    });
  } catch (error) {
    console.error("Erreur import bons de caisse:", error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'import des bons de caisse",
    });
  }
};
