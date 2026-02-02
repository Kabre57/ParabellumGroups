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
 * Get all opportunities with filtering
 */
exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      etape,
      statut,
      commercialId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (clientId) where.clientId = clientId;
    if (etape) where.etape = etape;
    if (statut) where.statut = statut;
    if (commercialId) where.commercialId = commercialId;
    
    // Date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Validate sort parameters
    const validSortFields = ['createdAt', 'dateFermetureEstimee', 'montantEstime', 'probabilite'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [opportunites, total] = await Promise.all([
      prisma.opportunite.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              raisonSociale: true,
              email: true,
              telephone: true,
              status: true
            }
          },
          produits: {
            select: {
              id: true,
              description: true,
              quantite: true,
              prixUnitaire: true,
              montantHT: true,
              montantTTC: true
            }
          },
          _count: {
            select: {
              produits: true
            }
          }
        },
        orderBy: { [sortField]: order }
      }),
      prisma.opportunite.count({ where })
    ]);

    // Calculate pipeline value
    const pipelineValue = await prisma.opportunite.aggregate({
      where: { ...where, statut: 'OUVERTE' },
      _sum: {
        montantEstime: true
      }
    });

    res.json({
      success: true,
      data: opportunites,
      meta: {
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        pipelineValue: pipelineValue._sum.montantEstime || 0
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des opportunités:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des opportunités'
    });
  }
};

/**
 * Create a new opportunity
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
      nom,
      description,
      montantEstime,
      probabilite,
      dateFermetureEstimee,
      etape,
      statut,
      source,
      commercialId,
      produits
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

    const opportunite = await prisma.$transaction(async (tx) => {
      // Create opportunity
      const newOpportunite = await tx.opportunite.create({
        data: {
          clientId,
          nom,
          description,
          montantEstime: parseFloat(montantEstime),
          probabilite: probabilite ? parseInt(probabilite) : 50,
          dateFermetureEstimee: dateFermetureEstimee ? new Date(dateFermetureEstimee) : null,
          etape: etape || 'PROSPECTION',
          statut: statut || 'OUVERTE',
          source,
          commercialId,
          createdById: req.user.id
        }
      });

      // Create product lines if provided
      if (produits && produits.length > 0) {
        const lignesProduit = produits.map(produit => ({
          opportuniteId: newOpportunite.id,
          produitId: produit.produitId,
          description: produit.description,
          quantite: parseInt(produit.quantite || 1),
          prixUnitaire: parseFloat(produit.prixUnitaire),
          remise: produit.remise ? parseFloat(produit.remise) : null,
          tva: parseFloat(produit.tva || 20),
          montantHT: parseFloat(produit.prixUnitaire) * parseInt(produit.quantite || 1) * (1 - (parseFloat(produit.remise || 0) / 100)),
          montantTTC: parseFloat(produit.prixUnitaire) * parseInt(produit.quantite || 1) * (1 - (parseFloat(produit.remise || 0) / 100)) * (1 + (parseFloat(produit.tva || 20) / 100))
        }));

        await tx.ligneProduit.createMany({
          data: lignesProduit
        });
      }

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId,
          typeChangement: 'CREATION',
          entite: 'OPPORTUNITE',
          entiteId: newOpportunite.id,
          nouvelleValeur: newOpportunite,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return newOpportunite;
    });

    logger.info('Opportunité créée', {
      opportuniteId: opportunite.id,
      clientId,
      userId: req.user.id,
      montant: opportunite.montantEstime
    });

    res.status(201).json({
      success: true,
      message: 'Opportunité créée avec succès',
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'opportunité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'opportunité'
    });
  }
};

/**
 * Get opportunity by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const opportunite = await prisma.opportunite.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true,
            commercialId: true
          }
        },
        produits: true
      }
    });

    if (!opportunite) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.json({
      success: true,
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'opportunité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'opportunité'
    });
  }
};

/**
 * Update opportunity
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

    const existingOpportunite = await prisma.opportunite.findUnique({
      where: { id }
    });

    if (!existingOpportunite) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    // Handle numeric conversions
    if (updateData.montantEstime) {
      updateData.montantEstime = parseFloat(updateData.montantEstime);
    }
    if (updateData.probabilite) {
      updateData.probabilite = parseInt(updateData.probabilite);
    }
    if (updateData.dateFermetureEstimee) {
      updateData.dateFermetureEstimee = new Date(updateData.dateFermetureEstimee);
    }

    const opportunite = await prisma.opportunite.update({
      where: { id },
      data: updateData
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId: existingOpportunite.clientId,
        typeChangement: 'MODIFICATION',
        entite: 'OPPORTUNITE',
        entiteId: id,
        nouvelleValeur: opportunite,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Opportunité mise à jour', {
      opportuniteId: id,
      clientId: existingOpportunite.clientId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Opportunité mise à jour avec succès',
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'opportunité:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'opportunité'
    });
  }
};

/**
 * Update opportunity stage
 */
exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { etape, notes } = req.body;

    const validEtapes = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FINALISATION'];
    
    if (!validEtapes.includes(etape)) {
      return res.status(400).json({
        success: false,
        error: 'Étape invalide',
        validEtapes
      });
    }

    const opportunite = await prisma.$transaction(async (tx) => {
      const existingOpportunite = await tx.opportunite.findUnique({
        where: { id }
      });

      if (!existingOpportunite) {
        throw new Error('Opportunité non trouvée');
      }

      const updatedOpportunite = await tx.opportunite.update({
        where: { id },
        data: { etape }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: existingOpportunite.clientId,
          typeChangement: 'ETAPE',
          entite: 'OPPORTUNITE',
          entiteId: id,
          ancienneValeur: { etape: existingOpportunite.etape },
          nouvelleValeur: { etape: updatedOpportunite.etape, notes },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedOpportunite;
    });

    res.json({
      success: true,
      message: `Étape mise à jour: ${etape}`,
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'étape:', error);
    
    if (error.message === 'Opportunité non trouvée') {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'étape'
    });
  }
};

/**
 * Close opportunity (won/lost)
 */
exports.close = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, raisonPerdue, montantFinal } = req.body;

    if (!['GAGNEE', 'PERDUE'].includes(statut)) {
      return res.status(400).json({
        success: false,
        error: 'Statut invalide pour fermeture',
        validStatuts: ['GAGNEE', 'PERDUE']
      });
    }

    const opportunite = await prisma.$transaction(async (tx) => {
      const existingOpportunite = await tx.opportunite.findUnique({
        where: { id }
      });

      if (!existingOpportunite) {
        throw new Error('Opportunité non trouvée');
      }

      const updateData = { statut };
      if (statut === 'PERDUE') updateData.raisonPerdue = raisonPerdue;
      if (montantFinal) updateData.montantEstime = parseFloat(montantFinal);

      const updatedOpportunite = await tx.opportunite.update({
        where: { id },
        data: updateData
      });

      // If won, update client status and create contract if montantFinal provided
      if (statut === 'GAGNEE' && montantFinal) {
        await tx.client.update({
          where: { id: existingOpportunite.clientId },
          data: {
            status: 'ACTIF',
            dateDevenirClient: new Date()
          }
        });

        // Create a contract from the opportunity
        const numeroContrat = await generateContratNumber(tx);
        const reference = await generateContratReference();

        await tx.contrat.create({
          data: {
            clientId: existingOpportunite.clientId,
            reference,
            numeroContrat,
            titre: `Contrat - ${existingOpportunite.nom}`,
            description: `Créé à partir de l'opportunité: ${existingOpportunite.nom}`,
            typeContrat: 'SERVICE',
            dateDebut: new Date(),
            montantHT: parseFloat(montantFinal) / 1.2, // Assuming 20% VAT
            montantTTC: parseFloat(montantFinal),
            tauxTVA: 20,
            status: 'EN_ATTENTE_SIGNATURE',
            createdBy: req.user.id
          }
        });
      }

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: existingOpportunite.clientId,
          typeChangement: 'FERMETURE',
          entite: 'OPPORTUNITE',
          entiteId: id,
          ancienneValeur: { statut: existingOpportunite.statut },
          nouvelleValeur: { statut: updatedOpportunite.statut, raisonPerdue, montantFinal },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedOpportunite;
    });

    logger.info('Opportunité fermée', {
      opportuniteId: id,
      statut,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: `Opportunité ${statut === 'GAGNEE' ? 'gagnée' : 'perdue'}`,
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la fermeture de l\'opportunité:', error);
    
    if (error.message === 'Opportunité non trouvée') {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la fermeture de l\'opportunité'
    });
  }
};

/**
 * Add product line to opportunity
 */
exports.addProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    const opportunite = await prisma.opportunite.findUnique({
      where: { id }
    });

    if (!opportunite) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    const ligneProduit = await prisma.ligneProduit.create({
      data: {
        opportuniteId: id,
        produitId: productData.produitId,
        description: productData.description,
        quantite: parseInt(productData.quantite || 1),
        prixUnitaire: parseFloat(productData.prixUnitaire),
        remise: productData.remise ? parseFloat(productData.remise) : null,
        tva: parseFloat(productData.tva || 20),
        montantHT: parseFloat(productData.prixUnitaire) * parseInt(productData.quantite || 1) * (1 - (parseFloat(productData.remise || 0) / 100)),
        montantTTC: parseFloat(productData.prixUnitaire) * parseInt(productData.quantite || 1) * (1 - (parseFloat(productData.remise || 0) / 100)) * (1 + (parseFloat(productData.tva || 20) / 100))
      }
    });

    // Recalculate opportunity amount
    const totalProduits = await prisma.ligneProduit.aggregate({
      where: { opportuniteId: id },
      _sum: {
        montantTTC: true
      }
    });

    await prisma.opportunite.update({
      where: { id },
      data: {
        montantEstime: totalProduits._sum.montantTTC || 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'Produit ajouté à l\'opportunité',
      data: ligneProduit
    });
  } catch (error) {
    logger.error('Erreur lors de l\'ajout du produit:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du produit'
    });
  }
};

/**
 * Get opportunity pipeline statistics
 */
exports.getPipelineStats = async (req, res) => {
  try {
    const { commercialId, startDate, endDate } = req.query;
    
    const where = {};
    if (commercialId) where.commercialId = commercialId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      byEtape,
      byStatut,
      totalValue,
      wonValue,
      conversionRate,
      averageDuration
    ] = await Promise.all([
      prisma.opportunite.groupBy({
        by: ['etape'],
        _count: true,
        _sum: {
          montantEstime: true
        },
        where: { ...where, statut: 'OUVERTE' }
      }),
      
      prisma.opportunite.groupBy({
        by: ['statut'],
        _count: true,
        _sum: {
          montantEstime: true
        },
        where
      }),
      
      prisma.opportunite.aggregate({
        where: { ...where, statut: 'OUVERTE' },
        _sum: {
          montantEstime: true
        }
      }),
      
      prisma.opportunite.aggregate({
        where: { ...where, statut: 'GAGNEE' },
        _sum: {
          montantEstime: true
        }
      }),
      
      // Calculate conversion rate
      (async () => {
        const total = await prisma.opportunite.count({
          where: { ...where, statut: { in: ['GAGNEE', 'PERDUE'] } }
        });
        
        const won = await prisma.opportunite.count({
          where: { ...where, statut: 'GAGNEE' }
        });
        
        return total > 0 ? (won / total * 100) : 0;
      })(),
      
      // Calculate average duration (days from creation to closure for won opportunities)
      prisma.opportunite.aggregate({
        where: { ...where, statut: 'GAGNEE', createdAt: { not: null } },
        _avg: {
          // This would need a closedAt field to calculate accurately
          // For now, we'll use a placeholder
        }
      })
    ]);

    const stats = {
      pipeline: byEtape.reduce((acc, curr) => {
        acc[curr.etape] = {
          count: curr._count,
          value: curr._sum.montantEstime || 0
        };
        return acc;
      }, {}),
      byStatut: byStatut.reduce((acc, curr) => {
        acc[curr.statut] = {
          count: curr._count,
          value: curr._sum.montantEstime || 0
        };
        return acc;
      }, {}),
      totals: {
        pipelineValue: totalValue._sum.montantEstime || 0,
        wonValue: wonValue._sum.montantEstime || 0,
        conversionRate: `${conversionRate.toFixed(2)}%`
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques du pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques du pipeline'
    });
  }
};