import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getInterventions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, missionId, statut, technicienId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { mission: { numIntervention: { contains: search as string, mode: 'insensitive' } } },
        { mission: { objectifDuContrat: { contains: search as string, mode: 'insensitive' } } },
        { commentaire: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (missionId) {
      whereClause.missionId = missionId as string;
    }

    if (statut) {
      whereClause.statut = statut;
    }

    if (technicienId) {
      whereClause.techniciens = {
        some: {
          technicienId: Number(technicienId)
        }
      };
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where: whereClause,
        include: {
          mission: {
            include: {
              client: {
                select: { name: true, customerNumber: true }
              }
            }
          },
          techniciens: {
            include: {
              technicien: {
                include: {
                  specialite: true
                }
              }
            }
          },
          rapports: {
            select: { id: true, titre: true, statut: true }
          },
          sortiesMateriels: {
            include: {
              materiel: {
                select: { designation: true, reference: true }
              }
            }
          },
          _count: {
            select: {
              rapports: true,
              sortiesMateriels: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.intervention.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        interventions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des interventions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getInterventionById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const intervention = await prisma.intervention.findUnique({
      where: { id: Number(id) },
      include: {
        mission: {
          include: {
            client: true
          }
        },
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true,
                utilisateur: {
                  select: { firstName: true, lastName: true, email: true }
                }
              }
            }
          }
        },
        rapports: {
          include: {
            technicien: {
              select: { nom: true, prenom: true }
            },
            images: true
          }
        },
        sortiesMateriels: {
          include: {
            materiel: true,
            technicien: {
              select: { nom: true, prenom: true }
            }
          }
        }
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention non trouvée'
      });
    }

    res.json({
      success: true,
      data: intervention
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createIntervention = async (req: AuthenticatedRequest, res: Response) => {
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
      dateHeureDebut,
      dateHeureFin,
      missionId,
      commentaire,
      techniciens,
      materiels
    } = req.body;

    // Vérifier que la mission existe
    const mission = await prisma.mission.findUnique({
      where: { numIntervention: missionId }
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    // Vérifier le stock des matériels
    if (materiels && materiels.length > 0) {
      for (const materielItem of materiels) {
        const materiel = await prisma.materiel.findUnique({
          where: { id: materielItem.materielId }
        });

        if (!materiel) {
          return res.status(404).json({
            success: false,
            message: `Matériel ${materielItem.materielId} non trouvé`
          });
        }

        if (materiel.quantiteDisponible < materielItem.quantite) {
          return res.status(400).json({
            success: false,
            message: `Stock insuffisant pour ${materiel.designation}. Disponible: ${materiel.quantiteDisponible}`
          });
        }
      }
    }

    // Calculer la durée si date de fin fournie
    let duree = null;
    if (dateHeureFin) {
      const debut = new Date(dateHeureDebut);
      const fin = new Date(dateHeureFin);
      duree = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60)); // en minutes
    }

    // Transaction pour créer l'intervention et gérer le stock
    const intervention = await prisma.$transaction(async (tx) => {
      // Créer l'intervention
      const newIntervention = await tx.intervention.create({
        data: {
          dateHeureDebut: new Date(dateHeureDebut),
          dateHeureFin: dateHeureFin ? new Date(dateHeureFin) : null,
          duree,
          missionId,
          statut: dateHeureFin ? 'terminee' : 'planifiee',
          commentaire,
          techniciens: {
            create: techniciens.map((tech: any) => ({
              technicienId: tech.technicienId,
              role: tech.role || 'Assistant',
              commentaire: tech.commentaire
            }))
          }
        },
        include: {
          mission: {
            include: {
              client: true
            }
          },
          techniciens: {
            include: {
              technicien: {
                include: {
                  specialite: true
                }
              }
            }
          }
        }
      });

      // Créer les sorties de matériel et déduire du stock
      if (materiels && materiels.length > 0) {
        for (const materielItem of materiels) {
          // Créer la sortie
          await tx.sortieMateriel.create({
            data: {
              materielId: materielItem.materielId,
              interventionId: newIntervention.id,
              technicienId: techniciens[0].technicienId, // Premier technicien par défaut
              quantite: materielItem.quantite,
              motif: 'Intervention',
              commentaire: materielItem.commentaire
            }
          });

          // Déduire du stock
          await tx.materiel.update({
            where: { id: materielItem.materielId },
            data: {
              quantiteDisponible: {
                decrement: materielItem.quantite
              }
            }
          });
        }
      }

      return newIntervention;
    });

    res.status(201).json({
      success: true,
      data: intervention,
      message: 'Intervention créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateIntervention = async (req: AuthenticatedRequest, res: Response) => {
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

    const existingIntervention = await prisma.intervention.findUnique({
      where: { id: Number(id) }
    });

    if (!existingIntervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention non trouvée'
      });
    }

    const {
      dateHeureDebut,
      dateHeureFin,
      commentaire,
      statut
    } = req.body;

    // Calculer la durée si les deux dates sont fournies
    let duree = existingIntervention.duree;
    if (dateHeureDebut && dateHeureFin) {
      const debut = new Date(dateHeureDebut);
      const fin = new Date(dateHeureFin);
      duree = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60));
    }

    const intervention = await prisma.intervention.update({
      where: { id: Number(id) },
      data: {
        dateHeureDebut: dateHeureDebut ? new Date(dateHeureDebut) : undefined,
        dateHeureFin: dateHeureFin ? new Date(dateHeureFin) : undefined,
        duree,
        commentaire,
        statut
      },
      include: {
        mission: {
          include: {
            client: true
          }
        },
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: intervention,
      message: 'Intervention mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingIntervention = await prisma.intervention.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            rapports: true,
            sortiesMateriels: true
          }
        }
      }
    });

    if (!existingIntervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention non trouvée'
      });
    }

    // Vérifier s'il y a des données associées
    if (existingIntervention._count.rapports > 0 || existingIntervention._count.sortiesMateriels > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une intervention ayant des rapports ou du matériel associé'
      });
    }

    await prisma.intervention.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Intervention supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const startIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const intervention = await prisma.intervention.findUnique({
      where: { id: Number(id) }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention non trouvée'
      });
    }

    if (intervention.statut === 'en_cours') {
      return res.status(400).json({
        success: false,
        message: 'Cette intervention est déjà en cours'
      });
    }

    const updatedIntervention = await prisma.intervention.update({
      where: { id: Number(id) },
      data: {
        dateHeureDebut: new Date(),
        statut: 'en_cours'
      },
      include: {
        mission: true,
        techniciens: {
          include: {
            technicien: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedIntervention,
      message: 'Intervention démarrée'
    });
  } catch (error) {
    console.error('Erreur lors du démarrage de l\'intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const endIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { commentaire } = req.body;

    const intervention = await prisma.intervention.findUnique({
      where: { id: Number(id) }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention non trouvée'
      });
    }

    if (intervention.statut === 'terminee') {
      return res.status(400).json({
        success: false,
        message: 'Cette intervention est déjà terminée'
      });
    }

    const dateHeureFin = new Date();
    const duree = Math.round((dateHeureFin.getTime() - intervention.dateHeureDebut.getTime()) / (1000 * 60));

    const updatedIntervention = await prisma.intervention.update({
      where: { id: Number(id) },
      data: {
        dateHeureFin,
        duree,
        statut: 'terminee',
        commentaire: commentaire || intervention.commentaire
      },
      include: {
        mission: true,
        techniciens: {
          include: {
            technicien: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedIntervention,
      message: 'Intervention terminée'
    });
  } catch (error) {
    console.error('Erreur lors de la fin de l\'intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const assignTechnicien = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { technicienId, role = 'Assistant', commentaire } = req.body;

    const intervention = await prisma.intervention.findUnique({
      where: { id: Number(id) }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention non trouvée'
      });
    }

    // Vérifier que le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        message: 'Technicien non trouvé'
      });
    }

    // Vérifier que le technicien n'est pas déjà assigné
    const existingAssignment = await prisma.technicienIntervention.findUnique({
      where: {
        technicienId_interventionId: {
          technicienId,
          interventionId: Number(id)
        }
      }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Ce technicien est déjà assigné à cette intervention'
      });
    }

    const assignment = await prisma.technicienIntervention.create({
      data: {
        technicienId,
        interventionId: Number(id),
        role,
        commentaire
      },
      include: {
        technicien: {
          include: {
            specialite: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Technicien assigné avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'assignation du technicien:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const removeTechnicien = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, technicienId } = req.params;

    const assignment = await prisma.technicienIntervention.findUnique({
      where: {
        technicienId_interventionId: {
          technicienId: Number(technicienId),
          interventionId: Number(id)
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignation non trouvée'
      });
    }

    await prisma.technicienIntervention.delete({
      where: {
        technicienId_interventionId: {
          technicienId: Number(technicienId),
          interventionId: Number(id)
        }
      }
    });

    res.json({
      success: true,
      message: 'Technicien retiré de l\'intervention'
    });
  } catch (error) {
    console.error('Erreur lors du retrait du technicien:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateIntervention = [
  body('dateHeureDebut').isISO8601().withMessage('Date de début invalide'),
  body('dateHeureFin').optional().isISO8601().withMessage('Date de fin invalide'),
  body('missionId').notEmpty().withMessage('Mission requise'),
  body('techniciens').isArray({ min: 1 }).withMessage('Au moins un technicien requis'),
  body('techniciens.*.technicienId').isInt().withMessage('ID technicien invalide'),
  body('techniciens.*.role').isIn(['Principal', 'Assistant']).withMessage('Rôle invalide')
];