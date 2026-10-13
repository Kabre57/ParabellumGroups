// Analyse le fichier et présente les lignes valides avant import.
const { getAccountImportAccessError, parseAccountingAccountWorkbook, requireActiveEnterpriseForImport, validateAccountingAccountImport } = require('./shared');

exports.previewAccountingAccountImport = async (req, res) => {
  try {
    const accessError = getAccountImportAccessError(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const enterprise = await requireActiveEnterpriseForImport(req);
    const parsedRows = parseAccountingAccountWorkbook(req.file, req.body?.corrections);
    const preview = await validateAccountingAccountImport(parsedRows, enterprise.enterpriseId);
    return res.json({
      success: true,
      data: { enterpriseId: enterprise.enterpriseId, enterpriseName: enterprise.enterpriseName, ...preview },
    });
  } catch (error) {
    console.error('Erreur aperçu import plan comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la lecture du fichier Excel.',
    });
  }
};
