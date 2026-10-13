// Gestion des campagnes, statistiques et séquences.
const { prisma, isMissingTableError, getUserId } = require('./shared');

exports.getStats = async (req, res) => {
  try {
    const { period = 'MONTHLY', userId, teamId, startDate, endDate } = req.query;

    // Filtrer par date si spécifié
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [
      totalProspects,
      byStage,
      byPriority,
      convertedCount,
      recentActivities,
      bySource,
      topSectors,
      revenueStats
    ] = await Promise.all([
      prisma.prospect.count(),
      prisma.prospect.groupBy({
        by: ['stage'],
        _count: { stage: true },
        where: dateFilter
      }),
      prisma.prospect.groupBy({
        by: ['priorite'],
        _count: { priorite: true },
        where: dateFilter
      }),
      prisma.prospect.count({
        where: {
          isConverted: true,
          ...dateFilter
        }
      }),
      prisma.prospectActivity.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          },
          isCompleted: true
        }
      }),
      prisma.prospect.groupBy({
        by: ['source'],
        _count: { source: true },
        where: dateFilter
      }),
      prisma.prospect.groupBy({
        by: ['secteurActivite'],
        _count: { secteurActivite: true },
        where: {
          secteurActivite: { not: null },
          ...dateFilter
        },
        orderBy: {
          _count: {
            secteurActivite: 'desc'
          }
        },
        take: 10
      }),
      prisma.prospect.aggregate({
        where: dateFilter,
        _sum: {
          potentialValue: true,
          revenue: true
        },
        _avg: {
          score: true,
          closingProbability: true
        }
      })
    ]);

    const byStageMap = byStage.reduce((acc, item) => {
      acc[item.stage] = item._count.stage;
      return acc;
    }, {});

    const byPriorityMap = byPriority.reduce((acc, item) => {
      acc[item.priorite] = item._count.priorite;
      return acc;
    }, {});

    const bySourceMap = bySource.reduce((acc, item) => {
      if (item.source) {
        acc[item.source] = item._count.source;
      }
      return acc;
    }, {});

    const bySectorMap = topSectors.reduce((acc, item) => {
      if (item.secteurActivite) {
        acc[item.secteurActivite] = item._count.secteurActivite;
      }
      return acc;
    }, {});

    const conversionRate = totalProspects > 0
      ? (convertedCount / totalProspects) * 100
      : 0;

    // Récupérer les statistiques planifiées
    const periodStats = await prisma.prospectionStats.findMany({
      where: {
        period,
        userId: userId || undefined,
        teamId: teamId || undefined,
        date: dateFilter
      },
      orderBy: { date: 'desc' },
      take: 12
    });

    res.json({
      success: true,
      data: {
        totalProspects,
        convertedProspects: convertedCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        recentActivities,
        totalPotentialValue: revenueStats._sum.potentialValue || 0,
        totalRevenue: revenueStats._sum.revenue || 0,
        averageScore: revenueStats._avg.score || 0,
        averageClosingProbability: revenueStats._avg.closingProbability || 0,
        byStage: byStageMap,
        byPriority: byPriorityMap,
        bySource: bySourceMap,
        bySector: bySectorMap,
        periodStats: periodStats.reverse(),
        timeframe: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    if (isMissingTableError(error)) {
      return res.json({
        success: true,
        data: {
          totalProspects: 0,
          convertedProspects: 0,
          conversionRate: 0,
          recentActivities: 0,
          byStage: {},
          byPriority: {},
        },
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { status, type } = req.query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type.toUpperCase();

    const campaigns = await prisma.prospectionCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { prospects: true }
        }
      }
    });

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des campagnes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const userId = getUserId(req);
    const campaignData = {
      ...req.body,
      createdById: userId
    };

    const campaign = await prisma.prospectionCampaign.create({
      data: campaignData
    });

    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campagne créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getSequences = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const sequences = await prisma.prospectionSequence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            steps: true,
            assignedProspects: true
          }
        },
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    res.json({
      success: true,
      data: sequences
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des séquences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des séquences',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.assignToSequence = async (req, res) => {
  try {
    const { id } = req.params;
    const { sequenceId } = req.body;
    const userId = getUserId(req);

    const assignment = await prisma.sequenceAssignment.create({
      data: {
        sequenceId,
        prospectId: id,
        assignedById: userId,
        status: 'ACTIVE',
        startedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Prospect assigné à la séquence avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'assignation à la séquence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'assignation à la séquence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
