const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const winston = require('winston');

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Get all interactions with filtering
 */
exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      contactId,
      type,
      canal,
      resultat,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (clientId) where.clientId = clientId;
    if (contactId) where.contactId = contactId;
    if (type) where.type = type;
    if (canal) where.canal = canal;
    if (resultat) where.resultat = resultat;
    
    // Date filters
    if (startDate || endDate) {
      where.dateInteraction = {};
      if (startDate) where.dateInteraction.gte = new Date(startDate);
      if (endDate) where.dateInteraction.lte = new Date(endDate);
    }
    
    if (search) {
      where.OR = [
        { sujet: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { resultat: { contains: search, mode: 'insensitive' } },
        { actionRequise: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [interactions, total] = await Promise.all([
      prisma.interactionClient.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              raisonSociale: true
            }
          },
          contact: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          },
          tacheLiee: {
            select: {
              id: true,
              titre: true,
              statut: true
            }
          }
        },
        orderBy: { dateInteraction: 'desc' }
      }),
      prisma.interactionClient.count({ where })
    ]);

    res.json({
      success: true,
      data: interactions,
      meta: {
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des interactions'
    });
  }
};

/**
 * Create a new interaction
 */
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      clientId,
      contactId,
      type,
      canal,
      sujet,
      description,
      dateInteraction,
      dateSuivie,
      dureeMinutes,
      resultat,
      actionRequise,
      participants,
      tags,
      piècesJointes,
      confidential
    } = req.body;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // Verify contact exists if provided
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact non trouvé'
        });
      }
    }

    const interaction = await prisma.interactionClient.create({
      data: {
        clientId,
        contactId,
        type,
        canal,
        sujet,
        description,
        dateInteraction: dateInteraction ? new Date(dateInteraction) : new Date(),
        dateSuivie: dateSuivie ? new Date(dateSuivie) : null,
        dureeMinutes: dureeMinutes ? parseInt(dureeMinutes) : null,
        resultat,
        actionRequise,
        createdById: req.user.id,
        participants: participants || [],
        tags: tags || [],
        piècesJointes: piècesJointes || [],
        confidential: confidential || false
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true
          }
        },
        contact: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    // Update client's last interaction date
    await prisma.client.update({
      where: { id: clientId },
      data: {
        dateDerniereInteraction: new Date()
      }
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId,
        typeChangement: 'CREATION',
        entite: 'INTERACTION',
        entiteId: interaction.id,
        nouvelleValeur: interaction,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Interaction créée', {
      interactionId: interaction.id,
      clientId,
      userId: req.user.id,
      type: interaction.type
    });

    res.status(201).json({
      success: true,
      message: 'Interaction créée avec succès',
      data: interaction
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'interaction'
    });
  }
};

/**
 * Get interaction by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.interactionClient.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true
          }
        },
        contact: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            poste: true
          }
        },
        tacheLiee: {
          select: {
            id: true,
            titre: true,
            description: true,
            statut: true,
            dateEcheance: true
          }
        }
      }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    res.json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'interaction'
    });
  }
};

/**
 * Update interaction
 */
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const existingInteraction = await prisma.interactionClient.findUnique({
      where: { id }
    });

    if (!existingInteraction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    // Handle date conversions
    if (updateData.dateInteraction) {
      updateData.dateInteraction = new Date(updateData.dateInteraction);
    }
    if (updateData.dateSuivie) {
      updateData.dateSuivie = new Date(updateData.dateSuivie);
    }
    if (updateData.dureeMinutes) {
      updateData.dureeMinutes = parseInt(updateData.dureeMinutes);
    }

    const interaction = await prisma.interactionClient.update({
      where: { id },
      data: updateData
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId: existingInteraction.clientId,
        typeChangement: 'MODIFICATION',
        entite: 'INTERACTION',
        entiteId: id,
        nouvelleValeur: interaction,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Interaction mise à jour', {
      interactionId: id,
      clientId: existingInteraction.clientId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Interaction mise à jour avec succès',
      data: interaction
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'interaction:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'interaction'
    });
  }
};

/**
 * Delete interaction
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.interactionClient.findUnique({
      where: { id }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Create historique entry before deletion
      await tx.historiqueClient.create({
        data: {
          clientId: interaction.clientId,
          typeChangement: 'SUPPRESSION',
          entite: 'INTERACTION',
          entiteId: id,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // Delete the interaction
      await tx.interactionClient.delete({
        where: { id }
      });
    });

    logger.info('Interaction supprimée', {
      interactionId: id,
      clientId: interaction.clientId,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'interaction:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'interaction'
    });
  }
};

/**
 * Link interaction to task
 */
exports.linkToTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { tacheId } = req.body;

    const interaction = await prisma.interactionClient.findUnique({
      where: { id }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    const tache = await prisma.tacheClient.findUnique({
      where: { id: tacheId }
    });

    if (!tache) {
      return res.status(404).json({
        success: false,
        error: 'Tâche non trouvée'
      });
    }

    const updatedInteraction = await prisma.interactionClient.update({
      where: { id },
      data: {
        tacheLiee: {
          connect: { id: tacheId }
        }
      }
    });

    res.json({
      success: true,
      message: 'Interaction liée à la tâche',
      data: updatedInteraction
    });
  } catch (error) {
    logger.error('Erreur lors de la liaison à la tâche:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la liaison à la tâche'
    });
  }
};

/**
 * Get interaction statistics
 */
exports.getStats = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    
    const where = {};
    if (clientId) where.clientId = clientId;
    
    if (startDate || endDate) {
      where.dateInteraction = {};
      if (startDate) where.dateInteraction.gte = new Date(startDate);
      if (endDate) where.dateInteraction.lte = new Date(endDate);
    }

    const [
      totalInteractions,
      byType,
      byCanal,
      byResultat,
      averageDuration,
      recentInteractions
    ] = await Promise.all([
      prisma.interactionClient.count({ where }),
      
      prisma.interactionClient.groupBy({
        by: ['type'],
        _count: true,
        where
      }),
      
      prisma.interactionClient.groupBy({
        by: ['canal'],
        _count: true,
        where
      }),
      
      prisma.interactionClient.groupBy({
        by: ['resultat'],
        _count: true,
        where
      }),
      
      prisma.interactionClient.aggregate({
        where: {
          ...where,
          dureeMinutes: { not: null }
        },
        _avg: {
          dureeMinutes: true
        }
      }),
      
      prisma.interactionClient.findMany({
        where,
        take: 10,
        orderBy: { dateInteraction: 'desc' },
        select: {
          id: true,
          type: true,
          sujet: true,
          dateInteraction: true,
          client: {
            select: {
              nom: true,
              raisonSociale: true
            }
          }
        }
      })
    ]);

    const stats = {
      totals: {
        interactions: totalInteractions,
        averageDuration: averageDuration._avg.dureeMinutes || 0
      },
      byType: byType.reduce((acc, curr) => {
        acc[curr.type] = curr._count;
        return acc;
      }, {}),
      byCanal: byCanal.reduce((acc, curr) => {
        acc[curr.canal] = curr._count;
        return acc;
      }, {}),
      byResultat: byResultat.reduce((acc, curr) => {
        acc[curr.resultat || 'NON_DEFINI'] = curr._count;
        return acc;
      }, {}),
      recent: recentInteractions
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};