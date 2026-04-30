const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { isForceDelete } = require('../utils/authz');

const normalizeImportKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const normalizeImportValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
};

const buildImportRowMap = (row) =>
  Object.entries(row || {}).reduce((map, [key, value]) => {
    map[normalizeImportKey(key)] = value;
    return map;
  }, {});

const pickImportValue = (rowMap, aliases) => {
  for (const alias of aliases) {
    const value = normalizeImportValue(rowMap[normalizeImportKey(alias)]);
    if (value !== undefined) return value;
  }

  return undefined;
};

const parseImportNumber = (value, fieldName) => {
  const normalized = normalizeImportValue(value);
  if (normalized === undefined) return undefined;
  const parsed = Number(normalized.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} doit etre un nombre valide`);
  }
  return parsed;
};

const parseImportInteger = (value, fieldName) => {
  const parsed = parseImportNumber(value, fieldName);
  if (parsed === undefined) return undefined;
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} doit etre un nombre entier`);
  }
  return parsed;
};

const compactImportData = (data) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, categorie, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (categorie) {
      where.categorie = categorie;
    }
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [materiels, total] = await Promise.all([
      prisma.materiel.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          _count: {
            select: {
              sorties: true
            }
          }
        },
        orderBy: { nom: 'asc' }
      }),
      prisma.materiel.count({ where })
    ]);

    const enrichedMateriels = materiels.map(m => ({
      ...m,
      enAlerte: m.quantiteStock <= m.seuilAlerte,
      enRupture: m.quantiteStock <= m.seuilRupture
    }));

    res.json({
      success: true,
      message: 'Matériels récupérés avec succès',
      data: enrichedMateriels,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll materiels:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des matériels'
    });
  }
};

exports.getAlertes = async (req, res) => {
  try {
    const materiels = await prisma.materiel.findMany({
      where: {
        OR: [
          { quantiteStock: { lte: prisma.materiel.fields.seuilAlerte } }
        ]
      },
      orderBy: { quantiteStock: 'asc' }
    });

    const alertes = materiels.filter(m => m.quantiteStock <= m.seuilAlerte);
    const ruptures = alertes.filter(m => m.quantiteStock <= m.seuilRupture);

    res.json({
      success: true,
      message: 'Alertes matériel récupérées avec succès',
      data: {
        total: alertes.length,
        ruptures: ruptures.length,
        alertes: alertes.map(m => ({
          ...m,
          niveau: m.quantiteStock <= m.seuilRupture ? 'RUPTURE' : 'ALERTE'
        }))
      }
    });
  } catch (error) {
    console.error('Error in getAlertes materiels:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des alertes'
    });
  }
};

exports.getSortiesEnCours = async (req, res) => {
  try {
    const sorties = await prisma.sortieMateriel.findMany({
      where: {
        dateRetour: null
      },
      include: {
        materiel: {
          select: {
            reference: true,
            nom: true
          }
        },
        intervention: {
          select: {
            titre: true,
            mission: {
              select: {
                numeroMission: true
              }
            }
          }
        },
        technicien: {
          select: {
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: { dateSortie: 'desc' }
    });

    res.json({
      success: true,
      message: 'Sorties de matériel en cours récupérées avec succès',
      data: sorties
    });
  } catch (error) {
    console.error('Error in getSortiesEnCours:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des sorties en cours'
    });
  }
};
/**
 * Récupère un matériel par son ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const materiel = await prisma.materiel.findUnique({
      where: { id },
      include: {
        sorties: {
          include: {
            intervention: {
              select: {
                id: true,
                titre: true,
                mission: {
                  select: {
                    numeroMission: true
                  }
                }
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          },
          orderBy: { dateSortie: 'desc' },
          take: 10
        },
        _count: {
          select: {
            sorties: true
          }
        }
      }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
      });
    }

    // Ajouter les indicateurs d'alerte
    const enrichedMateriel = {
      ...materiel,
      enAlerte: materiel.quantiteStock <= materiel.seuilAlerte,
      enRupture: materiel.quantiteStock <= materiel.seuilRupture
    };

    res.json({
      success: true,
      message: 'Matériel récupéré avec succès',
      data: enrichedMateriel
    });
  } catch (error) {
    console.error('Error in getById materiel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du matériel'
    });
  }
};

/**
 * Crée un nouveau matériel
 */
exports.create = async (req, res) => {
  try {
    const {
      reference,
      nom,
      description,
      categorie,
      quantiteStock,
      seuilAlerte,
      seuilRupture,
      prixUnitaire,
      fournisseur,
      emplacementStock,
      notes
    } = req.body;

    if (!reference || !nom || !categorie) {
      return res.status(400).json({
        success: false,
        error: 'Les champs reference, nom et categorie sont requis'
      });
    }

    const materiel = await prisma.materiel.create({
      data: {
        reference,
        nom,
        description,
        categorie,
        quantiteStock: quantiteStock || 0,
        seuilAlerte: seuilAlerte || 10,
        seuilRupture: seuilRupture || 5,
        prixUnitaire,
        fournisseur,
        emplacementStock,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Matériel créé avec succès',
      data: materiel
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Un matériel avec cette référence existe déjà'
      });
    }
    console.error('Error in create materiel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du matériel'
    });
  }
};

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
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const materiel = await prisma.materiel.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Matériel mis à jour avec succès',
      data: materiel
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Un matériel avec cette référence existe déjà'
      });
    }
    console.error('Error in update materiel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du matériel'
    });
  }
};

/**
 * Supprime un matériel
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = isForceDelete(req);

    // Vérifier si le matériel existe
    const materiel = await prisma.materiel.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sorties: true
          }
        }
      }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
      });
    }

    if ((materiel._count?.sorties || 0) > 0 && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer un matériel déjà utilisé dans une ou plusieurs sorties'
      });
    }

    if ((materiel._count?.sorties || 0) > 0 && forceDelete) {
      await prisma.sortieMateriel.deleteMany({
        where: { materielId: id }
      });
    }

    await prisma.materiel.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Matériel supprimé avec succès'
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer un matériel encore référencé'
      });
    }
    console.error('Error in delete materiel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du matériel'
    });
  }
};

/**
 * Gestion des sorties de matériel
 */
exports.createSortie = async (req, res) => {
  try {
    const {
      materielId,
      interventionId,
      technicienId,
      quantite,
      notes
    } = req.body;

    if (!materielId || !interventionId || !technicienId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId, interventionId, technicienId et quantite sont requis'
      });
    }

    // Vérifier la disponibilité du matériel
    const materiel = await prisma.materiel.findUnique({
      where: { id: materielId }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
      });
    }

    if (materiel.quantiteStock < quantite) {
      return res.status(400).json({
        success: false,
        error: 'Stock insuffisant pour cette sortie'
      });
    }

    // Créer la sortie
    const sortie = await prisma.sortieMateriel.create({
      data: {
        materielId,
        interventionId,
        technicienId,
        quantite,
        notes
      },
      include: {
        materiel: {
          select: {
            reference: true,
            nom: true
          }
        },
        intervention: {
          select: {
            titre: true,
            mission: {
              select: {
                numeroMission: true
              }
            }
          }
        },
        technicien: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    });

    // Mettre à jour le stock
    await prisma.materiel.update({
      where: { id: materielId },
      data: {
        quantiteStock: materiel.quantiteStock - quantite
      }
    });

    res.status(201).json({
      success: true,
      message: 'Sortie de matériel créée avec succès',
      data: sortie
    });
  } catch (error) {
    console.error('Error in createSortie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la sortie'
    });
  }
};

/**
 * Retour de matériel
 */
exports.retourSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const { etatRetour, notes } = req.body;

    const sortie = await prisma.sortieMateriel.findUnique({
      where: { id }
    });

    if (!sortie) {
      return res.status(404).json({
        success: false,
        error: 'Sortie non trouvée'
      });
    }

    if (sortie.dateRetour) {
      return res.status(400).json({
        success: false,
        error: 'Cette sortie a déjà été retournée'
      });
    }

    const updated = await prisma.sortieMateriel.update({
      where: { id },
      data: {
        dateRetour: new Date(),
        etatRetour,
        notes
      },
      include: {
        materiel: {
          select: {
            reference: true,
            nom: true
          }
        }
      }
    });

    // Restocker le matériel
    const materiel = await prisma.materiel.findUnique({
      where: { id: sortie.materielId }
    });

    if (materiel) {
      await prisma.materiel.update({
        where: { id: sortie.materielId },
        data: {
          quantiteStock: materiel.quantiteStock + sortie.quantite
        }
      });
    }

    res.json({
      success: true,
      message: 'Retour de matériel enregistré avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in retourSortie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement du retour'
    });
  }
};
