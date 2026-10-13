// Import en lot de materiels a partir de lignes tabulaires.
const { prisma, buildImportRowMap, pickImportValue, parseImportNumber, parseImportInteger, compactImportData } = require('./shared');

exports.importMateriels = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  const updateExisting = req.body?.options?.updateExisting !== false;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Aucune ligne materiel a importer'
    });
  }

  const result = {
    total: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (const [index, row] of items.entries()) {
    const rowNumber = index + 2;

    try {
      if (!row || typeof row !== 'object') {
        throw new Error('Ligne invalide');
      }

      const rowMap = buildImportRowMap(row);
      const reference = pickImportValue(rowMap, ['reference', 'ref', 'code']);
      const nom = pickImportValue(rowMap, ['nom', 'materiel', 'designation', 'name']);
      const categorie = pickImportValue(rowMap, ['categorie', 'category', 'famille']);

      if (!reference) {
        throw new Error('La reference est requise');
      }
      if (!nom) {
        throw new Error('Le nom est requis');
      }

      const existingMateriel = await prisma.materiel.findUnique({
        where: { reference }
      });

      if (existingMateriel && !updateExisting) {
        result.skipped += 1;
        continue;
      }

      if (!existingMateriel && !categorie) {
        throw new Error('La categorie est requise');
      }

      const data = compactImportData({
        reference,
        nom,
        description: pickImportValue(rowMap, ['description']),
        categorie,
        quantiteStock: parseImportInteger(pickImportValue(rowMap, ['quantiteStock', 'quantite stock', 'stock', 'quantite']), 'Quantite stock'),
        seuilAlerte: parseImportInteger(pickImportValue(rowMap, ['seuilAlerte', 'seuil alerte']), 'Seuil alerte'),
        seuilRupture: parseImportInteger(pickImportValue(rowMap, ['seuilRupture', 'seuil rupture']), 'Seuil rupture'),
        prixUnitaire: parseImportNumber(pickImportValue(rowMap, ['prixUnitaire', 'prix unitaire', 'prix']), 'Prix unitaire'),
        fournisseur: pickImportValue(rowMap, ['fournisseur', 'supplier']),
        emplacementStock: pickImportValue(rowMap, ['emplacementStock', 'emplacement stock', 'emplacement', 'localisation']),
        notes: pickImportValue(rowMap, ['notes', 'note'])
      });

      if (existingMateriel) {
        await prisma.materiel.update({
          where: { id: existingMateriel.id },
          data
        });
        result.updated += 1;
      } else {
        await prisma.materiel.create({
          data: {
            quantiteStock: 0,
            seuilAlerte: 10,
            seuilRupture: 5,
            ...data
          }
        });
        result.created += 1;
      }
    } catch (error) {
      result.skipped += 1;
      result.errors.push({
        row: rowNumber,
        message: error.code === 'P2002'
          ? `Valeur deja utilisee: ${error.meta?.target || 'champ unique'}`
          : error.message
      });
    }
  }

  res.json({
    success: result.errors.length === 0,
    message: 'Import materiel termine',
    data: result
  });
};

/**
 * Met à jour un matériel
 */
