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
 * Generate unique contract number
 */
async function generateContratNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CTR-${year}${month}`;

  const lastContrat = await prisma.contrat.findFirst({
    where: {
      numeroContrat: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroContrat: 'desc'
    }
  });

  let sequence = 1;
  if (lastContrat) {
    const lastNumber = lastContrat.numeroContrat.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceFormatted = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceFormatted}`;
}

/**
 * Generate contract reference
 */
async function generateContratReference() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `REF-${year}${month}`;

  const lastContrat = await prisma.contrat.findFirst({
    where: {
      reference: {
        startsWith: prefix
      }
    },
    orderBy: {
      reference: 'desc'
    }
  });

  let sequence = 1;
  if (lastContrat) {
    const lastNumber = lastContrat.reference.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceFormatted = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceFormatted}`;
}

/**
 * Get all contracts with advanced filtering
 */
exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      status,
      typeContrat,
      dateDebutStart,
      dateDebutEnd,
      dateFinStart,
      dateFinEnd,
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
    if (status) where.status = status;
    if (typeContrat) where.typeContrat = typeContrat;
    
    // Date filters
    if (dateDebutStart || dateDebutEnd) {
      where.dateDebut = {};
      if (dateDebutStart) where.dateDebut.gte = new Date(dateDebutStart);
      if (dateDebutEnd) where.dateDebut.lte = new Date(dateDebutEnd);
    }
    
    if (dateFinStart || dateFinEnd) {
      where.dateFin = {};
      if (dateFinStart) where.dateFin.gte = new Date(dateFinStart);
      if (dateFinEnd) where.dateFin.lte = new Date(dateFinEnd);
    }
    
    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { numeroContrat: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Validate sort parameters
    const validSortFields = ['dateDebut', 'dateFin', 'createdAt', 'montantHT', 'montantTTC'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [contrats, total] = await Promise.all([
      prisma.contrat.findMany({
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
              status: true,
              typeClient: {
                select: { libelle: true }
              }
            }
          },
          avenants: {
            orderBy: { dateEffet: 'desc' },
            take: 3
          },
          factures: {
            where: { statut: { in: ['EMISE', 'ENVOYEE', 'PAYEE'] } },
            orderBy: { dateEmission: 'desc' },
            take: 3
          },
          _count: {
            select: {
              avenants: true,
              factures: true
            }
          }
        },
        orderBy: { [sortField]: order }
      }),
      prisma.contrat.count({ where })
    ]);

    res.json({
      success: true,
      data: contrats,
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
    logger.error('Erreur lors de la récupération des contrats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des contrats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new contract
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
      titre,
      description,
      typeContrat,
      dateDebut,
      dateFin,
      dateSignature,
      dateEffet,
      montantHT,
      montantTTC,
      tauxTVA,
      devise,
      periodicitePaiement,
      jourPaiement,
      status,
      estRenouvelable,
      periodeRenouvellement,
      dateProchainRenouvellement,
      preavisRenouvellement,
      conditionsParticulieres,
      signataireId
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

    // Generate unique numbers
    const [numeroContrat, reference] = await Promise.all([
      generateContratNumber(prisma),
      generateContratReference()
    ]);

    const contrat = await prisma.$transaction(async (tx) => {
      const newContrat = await tx.contrat.create({
        data: {
          clientId,
          reference,
          numeroContrat,
          titre,
          description,
          typeContrat,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : null,
          dateSignature: dateSignature ? new Date(dateSignature) : null,
          dateEffet: dateEffet ? new Date(dateEffet) : null,
          montantHT: parseFloat(montantHT),
          montantTTC: parseFloat(montantTTC || montantHT * (1 + (parseFloat(tauxTVA) || 20) / 100)),
          devise: devise || 'EUR',
          tauxTVA: parseFloat(tauxTVA || 20),
          periodicitePaiement,
          jourPaiement: jourPaiement ? parseInt(jourPaiement) : null,
          status: status || 'BROUILLON',
          estRenouvelable: estRenouvelable || false,
          periodeRenouvellement,
          dateProchainRenouvellement: dateProchainRenouvellement ? new Date(dateProchainRenouvellement) : null,
          preavisRenouvellement: preavisRenouvellement ? parseInt(preavisRenouvellement) : null,
          conditionsParticulieres,
          signataireId,
          createdBy: req.user.id
        },
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              raisonSociale: true,
              email: true
            }
          }
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId,
          typeChangement: 'CREATION',
          entite: 'CONTRAT',
          entiteId: newContrat.id,
          nouvelleValeur: newContrat,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return newContrat;
    });

    logger.info('Contrat créé', {
      contratId: contrat.id,
      clientId,
      userId: req.user.id,
      montant: contrat.montantTTC
    });

    res.status(201).json({
      success: true,
      message: 'Contrat créé avec succès',
      data: contrat
    });
  } catch (error) {
    logger.error('Erreur lors de la création du contrat:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Un contrat avec ce numéro existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du contrat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contract by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const contrat = await prisma.contrat.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            contacts: {
              where: { principal: true },
              take: 1
            }
          }
        },
        avenants: {
          orderBy: { dateEffet: 'desc' }
        },
        factures: {
          orderBy: { dateEmission: 'desc' }
        }
      }
    });

    if (!contrat) {
      return res.status(404).json({
        success: false,
        error: 'Contrat non trouvé'
      });
    }

    res.json({
      success: true,
      data: contrat
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du contrat:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du contrat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update contract status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motif } = req.body;

    const validStatuses = ['BROUILLON', 'EN_ATTENTE_SIGNATURE', 'ACTIF', 'SUSPENDU', 'RESILIE', 'TERMINE', 'EN_RENOUVELLEMENT'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status invalide',
        validStatuses
      });
    }

    const contrat = await prisma.$transaction(async (tx) => {
      const oldContrat = await tx.contrat.findUnique({
        where: { id },
        include: { client: true }
      });

      if (!oldContrat) {
        throw new Error('Contrat non trouvé');
      }

      const updateData = { status };
      if (motif) {
        if (status === 'SUSPENDU') updateData.motifSuspension = motif;
        if (status === 'RESILIE') updateData.motifResiliation = motif;
      }

      const updatedContrat = await tx.contrat.update({
        where: { id },
        data: updateData
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: oldContrat.clientId,
          typeChangement: 'STATUT',
          entite: 'CONTRAT',
          entiteId: id,
          ancienneValeur: { status: oldContrat.status },
          nouvelleValeur: { status: updatedContrat.status, motif },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedContrat;
    });

    logger.info('Status contrat mis à jour', {
      contratId: id,
      userId: req.user.id,
      oldStatus: contrat.status,
      newStatus: status
    });

    res.json({
      success: true,
      message: `Status contrat mis à jour: ${status}`,
      data: contrat
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du status:', error);
    
    if (error.message === 'Contrat non trouvé' || error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Contrat non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contract statistics
 */
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, typeContrat } = req.query;
    
    const where = {};
    
    if (startDate || endDate) {
      where.dateDebut = {};
      if (startDate) where.dateDebut.gte = new Date(startDate);
      if (endDate) where.dateDebut.lte = new Date(endDate);
    }
    
    if (typeContrat) where.typeContrat = typeContrat;

    const [
      total,
      byStatus,
      byType,
      montantTotal,
      upcomingRenewals,
      expiringSoon
    ] = await Promise.all([
      // Total contracts
      prisma.contrat.count({ where }),
      
      // Contracts grouped by status
      prisma.contrat.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          montantTTC: true
        },
        where
      }),
      
      // Contracts grouped by type
      prisma.contrat.groupBy({
        by: ['typeContrat'],
        _count: true,
        _sum: {
          montantTTC: true
        },
        where
      }),
      
      // Total contract value
      prisma.contrat.aggregate({
        where: { ...where, status: { in: ['ACTIF', 'EN_RENOUVELLEMENT'] } },
        _sum: {
          montantTTC: true
        }
      }),
      
      // Upcoming renewals (next 30 days)
      prisma.contrat.count({
        where: {
          ...where,
          status: 'ACTIF',
          dateProchainRenouvellement: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      }),
      
      // Contracts expiring soon (next 30 days)
      prisma.contrat.count({
        where: {
          ...where,
          status: 'ACTIF',
          dateFin: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      })
    ]);

    const stats = {
      totals: {
        all: total,
        activeValue: montantTotal._sum.montantTTC || 0
      },
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr.status] = {
          count: curr._count,
          value: curr._sum.montantTTC || 0
        };
        return acc;
      }, {}),
      byType: byType.reduce((acc, curr) => {
        acc[curr.typeContrat] = {
          count: curr._count,
          value: curr._sum.montantTTC || 0
        };
        return acc;
      }, {}),
      alerts: {
        upcomingRenewals,
        expiringSoon
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create contract amendment (avenant)
 */
exports.createAvenant = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numeroAvenant,
      description,
      modifications,
      dateEffet,
      dateSignature,
      montantAdditionnel
    } = req.body;

    const contrat = await prisma.contrat.findUnique({
      where: { id }
    });

    if (!contrat) {
      return res.status(404).json({
        success: false,
        error: 'Contrat non trouvé'
      });
    }

    const avenant = await prisma.$transaction(async (tx) => {
      // Get last avenant number
      const lastAvenant = await tx.avenantContrat.findFirst({
        where: { contratId: id },
        orderBy: { numeroAvenant: 'desc' }
      });

      const avenantNumber = numeroAvenant || 
        `AV${String(parseInt(lastAvenant?.numeroAvenant.replace('AV', '') || '0') + 1).padStart(3, '0')}`;

      const newAvenant = await tx.avenantContrat.create({
        data: {
          contratId: id,
          numeroAvenant: avenantNumber,
          description,
          modifications,
          dateEffet: new Date(dateEffet),
          dateSignature: dateSignature ? new Date(dateSignature) : null,
          montantAdditionnel: montantAdditionnel ? parseFloat(montantAdditionnel) : null,
          createdBy: req.user.id
        }
      });

      // Update contract amount if montantAdditionnel provided
      if (montantAdditionnel) {
        await tx.contrat.update({
          where: { id },
          data: {
            montantTTC: contrat.montantTTC.plus(parseFloat(montantAdditionnel))
          }
        });
      }

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: contrat.clientId,
          typeChangement: 'CREATION',
          entite: 'AVENANT',
          entiteId: newAvenant.id,
          nouvelleValeur: newAvenant,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return newAvenant;
    });

    logger.info('Avenant créé', {
      avenantId: avenant.id,
      contratId: id,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Avenant créé avec succès',
      data: avenant
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'avenant:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'avenant',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contracts expiring soon
 */
exports.getExpiringSoon = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const thresholdDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);

    const contrats = await prisma.contrat.findMany({
      where: {
        status: 'ACTIF',
        dateFin: {
          lte: thresholdDate,
          gte: new Date()
        }
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true
          }
        }
      },
      orderBy: { dateFin: 'asc' }
    });

    res.json({
      success: true,
      data: contrats,
      meta: {
        thresholdDays: parseInt(days),
        thresholdDate,
        count: contrats.length
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des contrats expirants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des contrats expirants'
    });
  }
};