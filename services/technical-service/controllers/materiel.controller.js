const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    // Vérifier si le matériel existe
    const materiel = await prisma.materiel.findUnique({
      where: { id }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
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