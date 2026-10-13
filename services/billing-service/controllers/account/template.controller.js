// Lit le modèle Excel utilisé pour préparer un import de comptes.
const { ACCOUNT_IMPORT_HEADERS, XLSX, ensureAccountingAccountsWriteAccess, ensureAccountingReadAccess } = require('./shared');

exports.downloadAccountingAccountImportTemplate = async (req, res) => {
  try {
    const readAccessError = ensureAccountingReadAccess(req);
    const manageAccessError = ensureAccountingAccountsWriteAccess(req);
    if (readAccessError && manageAccessError) {
      return res.status(readAccessError.status).json(readAccessError.body);
    }

    const workbook = XLSX.utils.book_new();
    const accountsSheet = XLSX.utils.aoa_to_sheet([ACCOUNT_IMPORT_HEADERS]);
    accountsSheet['!cols'] = [
      { wch: 18 }, { wch: 38 }, { wch: 22 }, { wch: 52 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Plan comptable');

    const guideSheet = XLSX.utils.aoa_to_sheet([
      ['Guide d’import du plan comptable'],
      ['Colonne', 'Obligatoire', 'Règle'],
      ['Code', 'Oui', 'Code unique dans le fichier et dans l’entreprise active. Conservez les codes au format texte.'],
      ['Libellé', 'Oui', 'Nom du compte comptable.'],
      ['Type', 'Oui', 'Le type saisi par l’utilisateur est conservé : Actif, Passif, Capitaux propres, Produit ou Charge (ou ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE). Le code du compte ne change pas le type.'],
      ['Description', 'Non', 'Description ou précision comptable.'],
      ['Solde initial', 'Non', 'Nombre, avec virgule ou point décimal. Valeur par défaut : 0.'],
      ['', '', 'Les comptes déjà présents sont ignorés. Aucune donnée existante n’est remplacée ou supprimée.'],
      ['', '', 'L’entreprise est déterminée par le sélecteur de l’application. Ne pas ajouter de colonne entreprise.'],
    ]);
    guideSheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 105 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guide');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="modele-plan-comptable.xlsx"');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Erreur génération modèle du plan comptable:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la génération du modèle Excel.' });
  }
};
