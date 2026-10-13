// Consultation et recherche des contacts clients.
const { prisma, logger, validationResult, normalizeOptionalString, normalizeContactPayload } = require('./shared');

/**
 * Get all contacts with filtering
 */
exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      type,
      statut,
      principal,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (clientId) where.clientId = clientId;
    if (type) where.type = type;
    if (statut) where.statut = statut;
    if (principal !== undefined) where.principal = principal === 'true';

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { poste: { contains: search, mode: 'insensitive' } },
        { departement: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
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
              status: true,
              typeClient: {
                select: { libelle: true, couleur: true }
              }
            }
          }
        },
        orderBy: [
          { principal: 'desc' },
          { nom: 'asc' },
          { prenom: 'asc' }
        ]
      }),
      prisma.contact.count({ where })
    ]);

    res.json({
      success: true,
      data: contacts,
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
    logger.error('Erreur lors de la récupération des contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des contacts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contact by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true,
            telephone: true,
            mobile: true,
            siteWeb: true,
            status: true,
            typeClient: {
              select: { libelle: true }
            }
          }
        },
        interactions: {
          take: 10,
          orderBy: { dateInteraction: 'desc' }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du contact:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du contact',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
