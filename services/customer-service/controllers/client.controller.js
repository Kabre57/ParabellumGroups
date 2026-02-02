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
 * Generate unique client reference in format CLI-YYYYMM-NNNN
 */
async function generateClientReference() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CLI-${year}${month}`;

  const lastClient = await prisma.client.findFirst({
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
  if (lastClient) {
    const lastNumber = lastClient.reference.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceFormatted = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceFormatted}`;
}

/**
 * Get all clients with advanced filtering, pagination and search
 */
exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      typeClientId,
      secteurActiviteId,
      search,
      commercialId,
      priorite,
      source,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build dynamic where clause
    const where = {};
    
    if (status) where.status = status;
    if (typeClientId) where.typeClientId = typeClientId;
    if (secteurActiviteId) where.secteurActiviteId = secteurActiviteId;
    if (commercialId) where.commercialId = commercialId;
    if (priorite) where.priorite = priorite;
    if (source) where.source = source;
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { raisonSociale: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } },
        { siret: { contains: search, mode: 'insensitive' } },
        { tvaIntra: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Validate sort parameters
    const validSortFields = ['nom', 'createdAt', 'updatedAt', 'scoreFidelite', 'chiffreAffaireAnnuel'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        include: {
          typeClient: {
            select: { id: true, code: true, libelle: true, couleur: true }
          },
          secteurActivite: {
            select: { id: true, libelle: true, codeNAF: true }
          },
          contacts: {
            where: { principal: true },
            take: 1,
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true,
              poste: true
            }
          },
          contrats: {
            where: { status: 'ACTIF' },
            take: 3,
            orderBy: { dateFin: 'desc' }
          },
          _count: {
            select: {
              contacts: true,
              contrats: true,
              interactions: true,
              opportunites: true
            }
          }
        },
        orderBy: { [sortField]: order }
      }),
      prisma.client.count({ where })
    ]);

    // Calculate statistics
    const stats = await prisma.client.groupBy({
      by: ['status'],
      _count: true,
      where
    });

    logger.info('Clients récupérés', {
      count: clients.length,
      total,
      userId: req.user.id,
      filters: { status, typeClientId, search }
    });

    res.json({
      success: true,
      data: clients,
      meta: {
        pagination: {
          total,
          page: parseInt(page), 
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        stats: stats.reduce((acc, curr) => {
          acc[curr.status] = curr._count;
          return acc;
        }, {}),
        filters: {
          status,
          typeClientId,
          search,
          commercialId
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des clients:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des clients',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get client by ID with all related data
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        typeClient: true,
        secteurActivite: true,
        contacts: {
          orderBy: [
            { principal: 'desc' },
            { nom: 'asc' },
            { prenom: 'asc' }
          ]
        },
        contrats: {
          orderBy: { createdAt: 'desc' },
          include: {
            factures: {
              take: 5,
              orderBy: { dateEmission: 'desc' }
            }
          }
        },
        adresses: {
          orderBy: { isPrincipal: 'desc' }
        },
        interactions: {
          take: 10,
          orderBy: { dateInteraction: 'desc' },
          include: {
            contact: {
              select: { id: true, nom: true, prenom: true }
            }
          }
        },
        documents: {
          take: 10,
          orderBy: { dateUpload: 'desc' }
        },
        opportunites: {
          where: { statut: { not: 'TERMINEE' } },
          orderBy: { createdAt: 'desc' }
        },
        taches: {
          where: { statut: { not: 'TERMINEE' } },
          orderBy: { dateEcheance: 'asc' },
          take: 5
        },
        notes: {
          where: { estPrivee: false },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        preferences: true,
        tags: true,
        abonnements: {
          where: { statut: 'ACTIF' }
        },
        historique: {
          orderBy: { modifieLe: 'desc' },
          take: 20
        }
      }
    });

    if (!client) {
      logger.warn('Client non trouvé', { clientId: id, userId: req.user.id });
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // Log view for analytics
    await prisma.historiqueClient.create({
      data: {
        clientId: id,
        typeChangement: 'CONSULTATION',
        entite: 'CLIENT',
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Client récupéré', { clientId: id, userId: req.user.id });

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du client:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du client',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new client with comprehensive data
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
      nom,
      raisonSociale,
      email,
      telephone,
      mobile,
      siteWeb,
      siret,
      tvaIntra,
      typeClientId,
      secteurActiviteId,
      source,
      chiffreAffaireAnnuel,
      effectif,
      prospectId,
      commercialId
    } = req.body;

    // Check if email already exists
    const existingClient = await prisma.client.findUnique({
      where: { email }
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: 'Un client avec cet email existe déjà'
      });
    }

    // Generate unique reference
    const reference = await generateClientReference();

    // Create client with transaction
    const client = await prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          reference,
          nom,
          raisonSociale,
          email,
          telephone,
          mobile,
          siteWeb,
          siret,
          tvaIntra,
          typeClientId,
          secteurActiviteId,
          source,
          chiffreAffaireAnnuel: chiffreAffaireAnnuel ? parseFloat(chiffreAffaireAnnuel) : null,
          effectif: effectif ? parseInt(effectif) : null,
          prospectId,
          commercialId,
          datePremierContact: new Date(),
          createdBy: req.user.id,
          updatedBy: req.user.id
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: newClient.id,
          typeChangement: 'CREATION',
          entite: 'CLIENT',
          nouvelleValeur: newClient,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // If prospectId provided, create sync record
      if (prospectId) {
        await tx.synchronisationProspectClient.create({
          data: {
            prospectId,
            clientId: newClient.id,
            typeSync: 'PROSPECT_TO_CLIENT',
            status: 'SUCCES',
            details: {
              convertedAt: new Date(),
              convertedBy: req.user.id
            }
          }
        });
      }

      return newClient;
    });

    logger.info('Client créé', {
      clientId: client.id,
      userId: req.user.id,
      clientName: client.nom
    });

    res.status(201).json({
      success: true,
      message: 'Client créé avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la création du client:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Violation de contrainte unique',
        details: error.meta?.target || 'Champ unique déjà utilisé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du client',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update client information
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

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // Prepare update data
    const dataToUpdate = { ...updateData };
    if (dataToUpdate.chiffreAffaireAnnuel) {
      dataToUpdate.chiffreAffaireAnnuel = parseFloat(dataToUpdate.chiffreAffaireAnnuel);
    }
    if (dataToUpdate.effectif) {
      dataToUpdate.effectif = parseInt(dataToUpdate.effectif);
    }
    dataToUpdate.updatedBy = req.user.id;

    const client = await prisma.$transaction(async (tx) => {
      const oldClient = { ...existingClient };
      
      const updatedClient = await tx.client.update({
        where: { id },
        data: dataToUpdate
      });

      // Calculate differences
      const differences = {};
      Object.keys(dataToUpdate).forEach(key => {
        if (oldClient[key] !== updatedClient[key]) {
          differences[key] = {
            old: oldClient[key],
            new: updatedClient[key]
          };
        }
      });

      // Create historique entry if changes were made
      if (Object.keys(differences).length > 0) {
        await tx.historiqueClient.create({
          data: {
            clientId: id,
            typeChangement: 'MODIFICATION',
            entite: 'CLIENT',
            ancienneValeur: oldClient,
            nouvelleValeur: updatedClient,
            differences,
            modifieParId: req.user.id,
            modifieLe: new Date(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          }
        });
      }

      return updatedClient;
    });

    logger.info('Client mis à jour', {
      clientId: id,
      userId: req.user.id,
      fieldsUpdated: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: 'Client mis à jour avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du client:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Violation de contrainte unique',
        details: error.meta?.target || 'Champ unique déjà utilisé'
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du client',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update client status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, raison } = req.body;

    const validStatuses = ['PROSPECT', 'ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE', 'LEAD_CHAUD', 'LEAD_FROID'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status invalide',
        validStatuses
      });
    }

    const client = await prisma.$transaction(async (tx) => {
      const oldClient = await tx.client.findUnique({
        where: { id }
      });

      if (!oldClient) {
        throw new Error('Client non trouvé');
      }

      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          status,
          updatedBy: req.user.id,
          ...(status === 'ACTIF' && !oldClient.dateDevenirClient ? {
            dateDevenirClient: new Date()
          } : {})
        }
      });

      // Create historique entry for status change
      await tx.historiqueClient.create({
        data: {
          clientId: id,
          typeChangement: 'STATUT',
          entite: 'CLIENT',
          ancienneValeur: { status: oldClient.status },
          nouvelleValeur: { status: updatedClient.status, raison },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedClient;
    });

    logger.info('Status client mis à jour', {
      clientId: id,
      userId: req.user.id,
      oldStatus: client.status,
      newStatus: status
    });

    res.json({
      success: true,
      message: `Status client mis à jour: ${status}`,
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du status client:', error);
    
    if (error.message === 'Client non trouvé' || error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
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
 * Update client priority
 */
exports.updatePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priorite, raison } = req.body;

    const validPriorites = ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];
    
    if (!validPriorites.includes(priorite)) {
      return res.status(400).json({
        success: false,
        error: 'Priorité invalide',
        validPriorites
      });
    }

    const client = await prisma.$transaction(async (tx) => {
      const oldClient = await tx.client.findUnique({
        where: { id }
      });

      if (!oldClient) {
        throw new Error('Client non trouvé');
      }

      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          priorite,
          updatedBy: req.user.id
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: id,
          typeChangement: 'PRIORITE',
          entite: 'CLIENT',
          ancienneValeur: { priorite: oldClient.priorite },
          nouvelleValeur: { priorite: updatedClient.priorite, raison },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedClient;
    });

    res.json({
      success: true,
      message: `Priorité client mise à jour: ${priorite}`,
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la priorité:', error);
    
    if (error.message === 'Client non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la priorité',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get client statistics and KPIs
 */
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, commercialId } = req.query;
    
    const where = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    if (commercialId) where.commercialId = commercialId;

    const [
      totalClients,
      activeClients,
      newThisMonth,
      clientsByStatus,
      clientsByType,
      revenueStats,
      conversionStats
    ] = await Promise.all([
      // Total clients
      prisma.client.count({ where }),
      
      // Active clients
      prisma.client.count({ where: { ...where, status: 'ACTIF' } }),
      
      // New clients this month
      prisma.client.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      
      // Clients grouped by status
      prisma.client.groupBy({
        by: ['status'],
        _count: true,
        where
      }),
      
      // Clients grouped by type
      prisma.client.groupBy({
        by: ['typeClientId'],
        _count: true,
        where
      }),
      
      // Revenue statistics from active contracts
      prisma.contrat.aggregate({
        where: {
          status: 'ACTIF',
          client: where
        },
        _sum: {
          montantHT: true,
          montantTTC: true
        },
        _avg: {
          montantHT: true
        }
      }),
      
      // Conversion statistics from prospects
      prisma.client.groupBy({
        by: ['source'],
        _count: true,
        where: {
          ...where,
          prospectId: { not: null }
        }
      })
    ]);

    // Calculate growth
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
    
    const lastMonthClients = await prisma.client.count({
      where: {
        ...where,
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    });

    const growthRate = lastMonthClients > 0 
      ? ((newThisMonth - lastMonthClients) / lastMonthClients * 100).toFixed(2)
      : 0;

    const stats = {
      totals: {
        all: totalClients,
        active: activeClients,
        newThisMonth,
        lastMonth: lastMonthClients,
        growthRate: `${growthRate}%`
      },
      byStatus: clientsByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
      byType: clientsByType.reduce((acc, curr) => {
        acc[curr.typeClientId] = curr._count;
        return acc;
      }, {}),
      revenue: {
        totalHT: revenueStats._sum.montantHT || 0,
        totalTTC: revenueStats._sum.montantTTC || 0,
        averageContractValue: revenueStats._avg.montantHT || 0
      },
      conversions: conversionStats.reduce((acc, curr) => {
        acc[curr.source || 'unknown'] = curr._count;
        return acc;
      }, {})
    };

    logger.info('Statistiques clients récupérées', {
      userId: req.user.id,
      filters: { startDate, endDate, commercialId }
    });

    res.json({
      success: true,
      data: stats,
      meta: {
        generatedAt: new Date().toISOString(),
        period: {
          startDate,
          endDate,
          commercialId
        }
      }
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
 * Delete client (soft delete by setting status to ARCHIVE)
 */
exports.archive = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;

    const client = await prisma.$transaction(async (tx) => {
      const existingClient = await tx.client.findUnique({
        where: { id }
      });

      if (!existingClient) {
        throw new Error('Client non trouvé');
      }

      // Archive client
      const archivedClient = await tx.client.update({
        where: { id },
        data: {
          status: 'ARCHIVE',
          updatedBy: req.user.id
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: id,
          typeChangement: 'ARCHIVAGE',
          entite: 'CLIENT',
          ancienneValeur: existingClient,
          nouvelleValeur: { status: 'ARCHIVE', raison },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return archivedClient;
    });

    logger.info('Client archivé', {
      clientId: id,
      userId: req.user.id,
      raison
    });

    res.json({
      success: true,
      message: 'Client archivé avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de l\'archivage du client:', error);
    
    if (error.message === 'Client non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'archivage du client',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Search clients with advanced filtering
 */
exports.search = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }

    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { nom: { contains: q, mode: 'insensitive' } },
          { raisonSociale: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { telephone: { contains: q, mode: 'insensitive' } },
          { siret: { contains: q, mode: 'insensitive' } },
          { tvaIntra: { contains: q, mode: 'insensitive' } },
          { reference: { contains: q, mode: 'insensitive' } }
        ],
        status: { not: 'ARCHIVE' }
      },
      take: parseInt(limit),
      select: {
        id: true,
        reference: true,
        nom: true,
        raisonSociale: true,
        email: true,
        telephone: true,
        status: true,
        typeClient: {
          select: { id: true, libelle: true, couleur: true }
        },
        contacts: {
          where: { principal: true },
          take: 1,
          select: {
            nom: true,
            prenom: true,
            poste: true
          }
        }
      },
      orderBy: {
        _relevance: {
          fields: ['nom', 'raisonSociale', 'email'],
          search: q,
          sort: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: clients,
      meta: {
        query: q,
        limit: parseInt(limit),
        count: clients.length
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la recherche de clients:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};