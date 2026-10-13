// Gestion de la recherche et les statistiques clients.
const { prisma, logger, buildClientScopeWhere } = require('./shared');

exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, commercialId, enterpriseId, serviceId } = req.query;

    const where = buildClientScopeWhere(req, enterpriseId, serviceId);

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
      filters: { startDate, endDate, commercialId, enterpriseId, serviceId }
    });

    res.json({
      success: true,
      data: stats,
      meta: {
        generatedAt: new Date().toISOString(),
        period: {
          startDate,
          endDate,
          commercialId,
          enterpriseId,
          serviceId
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
          { idu: { contains: q, mode: 'insensitive' } },
          { ncc: { contains: q, mode: 'insensitive' } },
          { rccm: { contains: q, mode: 'insensitive' } },
          { codeActivite: { contains: q, mode: 'insensitive' } },
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
