// Consultation, filtres et echeances des documents clients.
const { prisma, logger, validationResult } = require('./shared');

/**
 * Get all documents with filtering
 */
exports.getAll = async (req, res) => {
  try {
    const {
      clientId,
      contratId,
      typeDocument,
      categorie,
      estValide,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (clientId) where.clientId = clientId;
    if (contratId) where.contratId = contratId;
    if (typeDocument) where.typeDocument = typeDocument;
    if (categorie) where.categorie = categorie;
    if (estValide !== undefined) where.estValide = estValide === 'true';

    if (search) {
      where.OR = [
        { nomFichier: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { motsCles: { has: search } }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.documentClient.findMany({
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
          contrat: {
            select: {
              id: true,
              titre: true,
              numeroContrat: true
            }
          }
        },
        orderBy: { dateUpload: 'desc' }
      }),
      prisma.documentClient.count({ where })
    ]);

    res.json({
      success: true,
      data: documents,
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
    logger.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents'
    });
  }
};

/**
 * Get document by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.documentClient.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true
          }
        },
        contrat: {
          select: {
            id: true,
            titre: true,
            numeroContrat: true,
            reference: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document non trouvé'
      });
    }

    // Check confidentiality
    if (document.confidential && req.user.role !== 'admin' && document.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit - Document confidentiel'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du document'
    });
  }
};

/**
 * Get expired or expiring soon documents
 */
exports.getExpiring = async (req, res) => {
  try {
    const { days = 30, clientId } = req.query;
    const thresholdDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);

    const where = {
      dateExpiration: {
        lte: thresholdDate,
        gte: new Date()
      },
      estValide: true
    };

    if (clientId) where.clientId = clientId;

    const documents = await prisma.documentClient.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true,
            email: true
          }
        }
      },
      orderBy: { dateExpiration: 'asc' }
    });

    const expired = await prisma.documentClient.findMany({
      where: {
        dateExpiration: {
          lt: new Date()
        },
        estValide: true
      },
      take: 10,
      orderBy: { dateExpiration: 'desc' }
    });

    res.json({
      success: true,
      data: {
        expiring: documents,
        expired,
        meta: {
          thresholdDays: parseInt(days),
          thresholdDate,
          expiringCount: documents.length,
          expiredCount: expired.length
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des documents expirants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents expirants'
    });
  }
};
