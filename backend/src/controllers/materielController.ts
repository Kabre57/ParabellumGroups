import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getMateriels = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, categorie, statut } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { reference: { contains: search as string, mode: 'insensitive' } },
        { designation: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (categorie) {
      whereClause.categorie = categorie;
    }

    if (statut) {
      whereClause.statut = statut;
    }

    const [materiels, total] = await Promise.all([
      prisma.materiel.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              sorties: true,
              entrees: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.materiel.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        materiels,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des matériels:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getMaterielById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const materiel = await prisma.materiel.findUnique({
      where: { id: Number(id) },
      include: {
        sorties: {
          include: {
            intervention: {
              include: {
                mission: {
                  include: {
                    client: {
                      select: { name: true }
                    }
                  }
                }
              }
            },
            technicien: {
              select: { nom: true, prenom: true }
            }
          },
          orderBy: { dateSortie: 'desc' }
        },
        entrees: {
          orderBy: { dateEntree: 'desc' }
        }
      }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        message: 'Matériel non trouvé'
      });
    }

    res.json({
      success: true,
      data: materiel
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du matériel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createMateriel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      reference,
      designation,
      description,
      quantiteTotale,
      quantiteDisponible,
      seuilAlerte,
      emplacement,
      categorie,
      prixUnitaire,
      fournisseur,
      dateAchat,
      garantie
    } = req.body;

    // Vérifier que la référence n'existe pas déjà
    const existingMateriel = await prisma.materiel.findUnique({
      where: { reference }
    });

    if (existingMateriel) {
      return res.status(400).json({
        success: false,
        message: 'Cette référence existe déjà'
      });
    }

    const materiel = await prisma.materiel.create({
      data: {
        reference,
        designation,
        description,
        quantiteTotale: quantiteTotale || 0,
        quantiteDisponible: quantiteDisponible || quantiteTotale || 0,
        seuilAlerte: seuilAlerte || 5,
        emplacement,
        categorie: categorie || 'Outillage',
        prixUnitaire,
        fournisseur,
        dateAchat: dateAchat ? new Date(dateAchat) : null,
        garantie
      }
    });

    // Créer l'entrée initiale si quantité > 0
    if (quantiteTotale > 0) {
      await prisma.entreeMateriel.create({
        data: {
          materielId: materiel.id,
          quantite: quantiteTotale,
          source: 'stock_initial',
          prixTotal: prixUnitaire ? prixUnitaire * quantiteTotale : 0,
          fournisseur,
          commentaire: 'Stock initial'
        }
      });
    }

    res.status(201).json({
      success: true,
      data: materiel,
      message: 'Matériel créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du matériel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateMateriel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const existingMateriel = await prisma.materiel.findUnique({
      where: { id: Number(id) }
    });

    if (!existingMateriel) {
      return res.status(404).json({
        success: false,
        message: 'Matériel non trouvé'
      });
    }

    const materiel = await prisma.materiel.update({
      where: { id: Number(id) },
      data: req.body
    });

    res.json({
      success: true,
      data: materiel,
      message: 'Matériel mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du matériel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteMateriel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingMateriel = await prisma.materiel.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            sorties: true,
            entrees: true
          }
        }
      }
    });

    if (!existingMateriel) {
      return res.status(404).json({
        success: false,
        message: 'Matériel non trouvé'
      });
    }

    // Vérifier s'il y a des mouvements
    if (existingMateriel._count.sorties > 0 || existingMateriel._count.entrees > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un matériel ayant des mouvements de stock'
      });
    }

    await prisma.materiel.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Matériel supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du matériel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createSortieMateriel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { interventionId, technicienId, quantite, motif, commentaire } = req.body;

    // Vérifier le stock disponible
    const materiel = await prisma.materiel.findUnique({
      where: { id: Number(id) }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        message: 'Matériel non trouvé'
      });
    }

    if (materiel.quantiteDisponible < quantite) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant. Disponible: ${materiel.quantiteDisponible}`
      });
    }

    // Créer la sortie et mettre à jour le stock
    const [sortie] = await prisma.$transaction([
      prisma.sortieMateriel.create({
        data: {
          materielId: Number(id),
          interventionId,
          technicienId,
          quantite,
          motif,
          commentaire
        },
        include: {
          materiel: true,
          intervention: {
            include: {
              mission: {
                include: {
                  client: {
                    select: { name: true }
                  }
                }
              }
            }
          },
          technicien: {
            select: { nom: true, prenom: true }
          }
        }
      }),
      prisma.materiel.update({
        where: { id: Number(id) },
        data: {
          quantiteDisponible: materiel.quantiteDisponible - quantite
        }
      })
    ]);

    res.status(201).json({
      success: true,
      data: sortie,
      message: 'Sortie de matériel enregistrée'
    });
  } catch (error) {
    console.error('Erreur lors de la sortie de matériel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createEntreeMateriel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { quantite, source, prixTotal, fournisseur, facture, commentaire } = req.body;

    const materiel = await prisma.materiel.findUnique({
      where: { id: Number(id) }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        message: 'Matériel non trouvé'
      });
    }

    // Créer l'entrée et mettre à jour le stock
    const [entree] = await prisma.$transaction([
      prisma.entreeMateriel.create({
        data: {
          materielId: Number(id),
          quantite,
          source: source || 'achat',
          prixTotal,
          fournisseur,
          facture,
          commentaire
        },
        include: {
          materiel: true
        }
      }),
      prisma.materiel.update({
        where: { id: Number(id) },
        data: {
          quantiteTotale: materiel.quantiteTotale + quantite,
          quantiteDisponible: materiel.quantiteDisponible + quantite
        }
      })
    ]);

    res.status(201).json({
      success: true,
      data: entree,
      message: 'Entrée de matériel enregistrée'
    });
  } catch (error) {
    console.error('Erreur lors de l\'entrée de matériel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getStockAlerts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alertes = await prisma.materiel.findMany({
      where: {
        quantiteDisponible: {
          lte: prisma.materiel.fields.seuilAlerte
        },
        statut: 'actif'
      },
      orderBy: {
        quantiteDisponible: 'asc'
      },
      take: 20
    });

    res.json({
      success: true,
      data: alertes
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateMateriel = [
  body('reference').notEmpty().withMessage('Référence requise'),
  body('designation').notEmpty().withMessage('Désignation requise'),
  body('quantiteTotale').optional().isInt({ min: 0 }).withMessage('Quantité totale invalide'),
  body('quantiteDisponible').optional().isInt({ min: 0 }).withMessage('Quantité disponible invalide'),
  body('seuilAlerte').optional().isInt({ min: 0 }).withMessage('Seuil d\'alerte invalide')
];

export const validateSortieMateriel = [
  body('interventionId').isInt().withMessage('Intervention requise'),
  body('technicienId').isInt().withMessage('Technicien requis'),
  body('quantite').isInt({ min: 1 }).withMessage('Quantité invalide')
];

export const validateEntreeMateriel = [
  body('quantite').isInt({ min: 1 }).withMessage('Quantité invalide'),
  body('source').optional().isString().withMessage('Source invalide')
];