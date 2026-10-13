// Gestion de la lecture des clients.
const { prisma, logger, buildClientScopeWhere } = require('./shared');

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
      enterpriseId,
      serviceId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build dynamic where clause
    const where = buildClientScopeWhere(req, enterpriseId, serviceId);

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
        { idu: { contains: search, mode: 'insensitive' } },
        { ncc: { contains: search, mode: 'insensitive' } },
        { rccm: { contains: search, mode: 'insensitive' } },
        { codeActivite: { contains: search, mode: 'insensitive' } },
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
            select: { id: true, libelle: true, codeActivite: true }
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
          commercialId,
          enterpriseId,
          serviceId
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

    // Log view for analytics (ne pas bloquer la lecture si l'historique échoue)
    try {
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
    } catch (historyError) {
      logger.warn('Historique client non enregistré', {
        clientId: id,
        error: historyError?.message
      });
    }

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
