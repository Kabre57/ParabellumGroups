const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, missionId, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (missionId) {
      where.missionId = missionId;
    }
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          mission: {
            select: {
              id: true,
              numeroMission: true,
              titre: true
            }
          },
          techniciens: {
            include: {
              technicien: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true
                }
              }
            }
          },
          _count: {
            select: {
              rapports: true,
              materielUtilise: true
            }
          }
        },
        orderBy: { dateDebut: 'desc' }
      }),
      prisma.intervention.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Interventions récupérées avec succès',
      data: interventions,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll interventions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des interventions'
    });
  }
};

/**
 * Ajoute un technicien à une intervention existante
 */
exports.addTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: true
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le technicien n'est pas déjà assigné
    const alreadyAssigned = intervention.techniciens.some(
      (t) => t.technicienId === technicienId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette intervention'
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Ajouter le technicien
    await prisma.interventionTechnicien.create({
      data: {
        interventionId: id,
        technicienId,
        role: role || 'Assistant'
      }
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Technicien ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du technicien'
    });
  }
};

/**
 * Ajoute du matériel à une intervention existante
 */
exports.addMateriel = async (req, res) => {
  try {
    const { id } = req.params;
    const { materielId, quantite, notes, technicienId } = req.body;

    if (!materielId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId et quantite sont requis'
      });
    }

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis pour la sortie de matériel'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le matériel existe et le stock
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
        error: `Stock insuffisant. Disponible : ${materiel.quantiteStock}`
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Transaction : ajouter la sortie et décrémenter le stock
    await prisma.$transaction(async (tx) => {
      await tx.sortieMateriel.create({
        data: {
          materielId,
          interventionId: id,
          technicienId,
          quantite: Number(quantite),
          notes
        }
      });

      await tx.materiel.update({
        where: { id: materielId },
        data: {
          quantiteStock: materiel.quantiteStock - Number(quantite)
        }
      });
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        materielUtilise: {
          include: {
            materiel: {
              select: {
                id: true,
                reference: true,
                nom: true
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Matériel ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addMateriel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du matériel'
    });
  }
};


exports.create = async (req, res) => {
  try {
    const {
      missionId,
      titre,
      description,
      dateDebut,
      dateFin,
      dureeEstimee,
      technicienIds,
      techniciens,
      materiels
    } = req.body;

    if (!missionId || !titre || !dateDebut) {
      return res.status(400).json({
        success: false,
        error: 'Les champs missionId, titre et dateDebut sont requis'
      });
    }

    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée'
      });
    }

    const resolvedTechnicienIds = Array.isArray(technicienIds)
      ? technicienIds
      : Array.isArray(techniciens)
        ? techniciens.map((technicien) => technicien.technicienId).filter(Boolean)
        : [];

    // Techniciens optionnels maintenant, peuvent être ajoutés après
    const intervention = await prisma.$transaction(async (tx) => {
      const created = await tx.intervention.create({
        data: {
          missionId,
          titre,
          description,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : undefined,
          dureeEstimee,
          techniciens: resolvedTechnicienIds.length > 0 ? {
            create: resolvedTechnicienIds.map((technicienId) => ({
              technicienId
            }))
          } : undefined
        }
      });

      if (Array.isArray(materiels) && materiels.length > 0) {
        for (const materielItem of materiels) {
          const materielId = materielItem?.materielId;
          const quantite = Number(materielItem?.quantite || 0);
          const technicienId = materielItem?.technicienId || resolvedTechnicienIds[0];

          if (!materielId || !quantite) {
            continue;
          }

          if (!technicienId) {
            const error = new Error('Technicien requis pour la sortie de matériel');
            error.status = 400;
            throw error;
          }

          const materiel = await tx.materiel.findUnique({
            where: { id: materielId }
          });

          if (!materiel) {
            const error = new Error('Matériel non trouvé');
            error.status = 404;
            throw error;
          }

          if (materiel.quantiteStock < quantite) {
            const error = new Error('Stock insuffisant pour cette sortie');
            error.status = 400;
            throw error;
          }

          await tx.sortieMateriel.create({
            data: {
              materielId,
              interventionId: created.id,
              technicienId,
              quantite,
              notes: materielItem?.notes
            }
          });

          await tx.materiel.update({
            where: { id: materielId },
            data: {
              quantiteStock: materiel.quantiteStock - quantite
            }
          });
        }
      }

      return tx.intervention.findUnique({
        where: { id: created.id },
        include: {
          mission: {
            select: {
              id: true,
              numeroMission: true,
              titre: true,
              clientNom: true,
              clientContact: true,
              adresse: true,
              description: true,
              dateDebut: true,
              dateFin: true,
              priorite: true,
              status: true
            }
          },
          techniciens: {
            include: {
              technicien: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true
                }
              }
            }
          },
          materielUtilise: {
            include: {
              materiel: {
                select: {
                  id: true,
                  reference: true,
                  nom: true
                }
              },
              technicien: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true
                }
              }
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Intervention créée avec succès',
      data: intervention
    });
  } catch (error) {
    console.error('Error in create intervention:', error);
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    });
  }
};


exports.complete = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultats, observations } = req.body;

    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    const dateFin = new Date();
    const dureeReelle = intervention.dateDebut ? 
      (dateFin - intervention.dateDebut) / (1000 * 60 * 60) : null;

    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        status: 'TERMINEE',
        dateFin,
        dureeReelle,
        resultats,
        observations
      },
      include: {
        mission: {
          select: {
            id: true,
            numeroMission: true,
            titre: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Intervention terminée avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in complete intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la finalisation de l\'intervention'
    });
  }
};

/**
 * Ajoute un technicien à une intervention existante
 */
exports.addTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: true
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le technicien n'est pas déjà assigné
    const alreadyAssigned = intervention.techniciens.some(
      (t) => t.technicienId === technicienId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette intervention'
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Ajouter le technicien
    await prisma.interventionTechnicien.create({
      data: {
        interventionId: id,
        technicienId,
        role: role || 'Assistant'
      }
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Technicien ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du technicien'
    });
  }
};

/**
 * Ajoute du matériel à une intervention existante
 */
exports.addMateriel = async (req, res) => {
  try {
    const { id } = req.params;
    const { materielId, quantite, notes, technicienId } = req.body;

    if (!materielId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId et quantite sont requis'
      });
    }

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis pour la sortie de matériel'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le matériel existe et le stock
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
        error: `Stock insuffisant. Disponible : ${materiel.quantiteStock}`
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Transaction : ajouter la sortie et décrémenter le stock
    await prisma.$transaction(async (tx) => {
      await tx.sortieMateriel.create({
        data: {
          materielId,
          interventionId: id,
          technicienId,
          quantite: Number(quantite),
          notes
        }
      });

      await tx.materiel.update({
        where: { id: materielId },
        data: {
          quantiteStock: materiel.quantiteStock - Number(quantite)
        }
      });
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        materielUtilise: {
          include: {
            materiel: {
              select: {
                id: true,
                reference: true,
                nom: true
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Matériel ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addMateriel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du matériel'
    });
  }
};

/**
 * Récupère une intervention par son ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        mission: {
          select: {
            id: true,
            numeroMission: true,
            titre: true
          }
        },
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        },
        materielUtilise: {
          include: {
            materiel: {
              select: {
                id: true,
                reference: true,
                nom: true
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        },
        rapports: {
          include: {
            redacteur: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        },
        _count: {
          select: {
            rapports: true,
            materielUtilise: true,
            techniciens: true
          }
        }
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Intervention récupérée avec succès',
      data: intervention
    });
  } catch (error) {
    console.error('Error in getById intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'intervention'
    });
  }
};

/**
 * Ajoute un technicien à une intervention existante
 */
exports.addTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: true
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le technicien n'est pas déjà assigné
    const alreadyAssigned = intervention.techniciens.some(
      (t) => t.technicienId === technicienId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette intervention'
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Ajouter le technicien
    await prisma.interventionTechnicien.create({
      data: {
        interventionId: id,
        technicienId,
        role: role || 'Assistant'
      }
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Technicien ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du technicien'
    });
  }
};

/**
 * Ajoute du matériel à une intervention existante
 */
exports.addMateriel = async (req, res) => {
  try {
    const { id } = req.params;
    const { materielId, quantite, notes, technicienId } = req.body;

    if (!materielId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId et quantite sont requis'
      });
    }

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis pour la sortie de matériel'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le matériel existe et le stock
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
        error: `Stock insuffisant. Disponible : ${materiel.quantiteStock}`
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Transaction : ajouter la sortie et décrémenter le stock
    await prisma.$transaction(async (tx) => {
      await tx.sortieMateriel.create({
        data: {
          materielId,
          interventionId: id,
          technicienId,
          quantite: Number(quantite),
          notes
        }
      });

      await tx.materiel.update({
        where: { id: materielId },
        data: {
          quantiteStock: materiel.quantiteStock - Number(quantite)
        }
      });
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        materielUtilise: {
          include: {
            materiel: {
              select: {
                id: true,
                reference: true,
                nom: true
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Matériel ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addMateriel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du matériel'
    });
  }
};


/**
 * Met à jour une intervention
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titre,
      description,
      dateDebut,
      dateFin,
      dureeEstimee,
      status,
      technicienIds,
      techniciens
    } = req.body;

    // Vérifier si l'intervention existe
    const interventionExist = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!interventionExist) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Valider le statut si fourni
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être l'un des suivants: ${VALID_STATUSES.join(', ')}`
      });
    }

    const resolvedTechnicienIds = Array.isArray(technicienIds)
      ? technicienIds
      : Array.isArray(techniciens)
        ? techniciens.map((technicien) => technicien.technicienId).filter(Boolean)
        : null;

    const intervention = await prisma.intervention.update({
      where: { id },
      data: {
        titre,
        description,
        dateDebut: dateDebut ? new Date(dateDebut) : undefined,
        dateFin: dateFin ? new Date(dateFin) : undefined,
        dureeEstimee,
        status,
        techniciens: resolvedTechnicienIds ? {
          deleteMany: {}, // Supprimer les assignations existantes
          create: resolvedTechnicienIds.map(technicienId => ({
            technicienId
          }))
        } : undefined
      },
      include: {
        mission: {
          select: {
            id: true,
            numeroMission: true,
            titre: true
          }
        },
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Intervention mise à jour avec succès',
      data: intervention
    });
  } catch (error) {
    console.error('Error in update intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'intervention'
    });
  }
};

/**
 * Ajoute un technicien à une intervention existante
 */
exports.addTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: true
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le technicien n'est pas déjà assigné
    const alreadyAssigned = intervention.techniciens.some(
      (t) => t.technicienId === technicienId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette intervention'
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Ajouter le technicien
    await prisma.interventionTechnicien.create({
      data: {
        interventionId: id,
        technicienId,
        role: role || 'Assistant'
      }
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Technicien ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du technicien'
    });
  }
};

/**
 * Ajoute du matériel à une intervention existante
 */
exports.addMateriel = async (req, res) => {
  try {
    const { id } = req.params;
    const { materielId, quantite, notes, technicienId } = req.body;

    if (!materielId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId et quantite sont requis'
      });
    }

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis pour la sortie de matériel'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le matériel existe et le stock
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
        error: `Stock insuffisant. Disponible : ${materiel.quantiteStock}`
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Transaction : ajouter la sortie et décrémenter le stock
    await prisma.$transaction(async (tx) => {
      await tx.sortieMateriel.create({
        data: {
          materielId,
          interventionId: id,
          technicienId,
          quantite: Number(quantite),
          notes
        }
      });

      await tx.materiel.update({
        where: { id: materielId },
        data: {
          quantiteStock: materiel.quantiteStock - Number(quantite)
        }
      });
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        materielUtilise: {
          include: {
            materiel: {
              select: {
                id: true,
                reference: true,
                nom: true
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Matériel ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addMateriel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du matériel'
    });
  }
};


/**
 * Supprime une intervention
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    await prisma.intervention.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Intervention supprimée avec succès'
    });
  } catch (error) {
    console.error('Error in delete intervention:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'intervention'
    });
  }
};

/**
 * Ajoute un technicien à une intervention existante
 */
exports.addTechnicien = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicienId, role } = req.body;

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: true
      }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le technicien n'est pas déjà assigné
    const alreadyAssigned = intervention.techniciens.some(
      (t) => t.technicienId === technicienId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        error: 'Ce technicien est déjà assigné à cette intervention'
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Ajouter le technicien
    await prisma.interventionTechnicien.create({
      data: {
        interventionId: id,
        technicienId,
        role: role || 'Assistant'
      }
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Technicien ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addTechnicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du technicien'
    });
  }
};

/**
 * Ajoute du matériel à une intervention existante
 */
exports.addMateriel = async (req, res) => {
  try {
    const { id } = req.params;
    const { materielId, quantite, notes, technicienId } = req.body;

    if (!materielId || !quantite) {
      return res.status(400).json({
        success: false,
        error: 'Les champs materielId et quantite sont requis'
      });
    }

    if (!technicienId) {
      return res.status(400).json({
        success: false,
        error: 'Le champ technicienId est requis pour la sortie de matériel'
      });
    }

    // Vérifier si l'intervention existe
    const intervention = await prisma.intervention.findUnique({
      where: { id }
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvée'
      });
    }

    // Vérifier si le matériel existe et le stock
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
        error: `Stock insuffisant. Disponible : ${materiel.quantiteStock}`
      });
    }

    // Vérifier si le technicien existe
    const technicien = await prisma.technicien.findUnique({
      where: { id: technicienId }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    // Transaction : ajouter la sortie et décrémenter le stock
    await prisma.$transaction(async (tx) => {
      await tx.sortieMateriel.create({
        data: {
          materielId,
          interventionId: id,
          technicienId,
          quantite: Number(quantite),
          notes
        }
      });

      await tx.materiel.update({
        where: { id: materielId },
        data: {
          quantiteStock: materiel.quantiteStock - Number(quantite)
        }
      });
    });

    // Récupérer l'intervention mise à jour
    const updated = await prisma.intervention.findUnique({
      where: { id },
      include: {
        materielUtilise: {
          include: {
            materiel: {
              select: {
                id: true,
                reference: true,
                nom: true
              }
            },
            technicien: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Matériel ajouté avec succès',
      data: updated
    });
  } catch (error) {
    console.error('Error in addMateriel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du matériel'
    });
  }
};



