const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Contrôleur pour la gestion complète de la prospection
 */
exports.getAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      stage, 
      assignedToId, 
      priority, 
      search,
      isConverted,
      sector,
      source,
      country,
      scoreMin,
      scoreMax
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    
    if (stage) {
      where.stage = stage.toUpperCase();
    }
    
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }
    
    if (priority) {
      where.priorite = priority.toUpperCase();
    }
    
    if (isConverted !== undefined) {
      where.isConverted = isConverted === 'true';
    }
    
    if (sector) {
      where.secteurActivite = { contains: sector, mode: 'insensitive' };
    }
    
    if (source) {
      where.source = source.toUpperCase();
    }
    
    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }
    
    if (scoreMin || scoreMax) {
      where.score = {};
      if (scoreMin) where.score.gte = parseInt(scoreMin);
      if (scoreMax) where.score.lte = parseInt(scoreMax);
    }
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { siret: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          activities: {
            take: 5,
            orderBy: { scheduledAt: 'desc' },
            where: {
              isCompleted: true
            }
          },
          documentsRel: {
            take: 3,
            orderBy: { uploadedAt: 'desc' }
          },
          notesRel: {
            take: 3,
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.prospect.count({ where })
    ]);
    
    res.json({
      success: true,
      data: prospects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des prospects:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des prospects',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            documents: true
          }
        },
        documentsRel: {
          orderBy: { uploadedAt: 'desc' }
        },
        notesRel: {
          orderBy: { createdAt: 'desc' }
        },
        competitors: {
          orderBy: { createdAt: 'desc' }
        },
        history: {
          orderBy: { changedAt: 'desc' },
          take: 20
        }
      }
    });
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: prospect
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.create = async (req, res) => {
  try {
    // Générer une référence unique
    const reference = `PROS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const prospectData = {
      ...req.body,
      reference,
      assignedToId: req.body.assignedToId || req.user.id,
      assignedAt: req.body.assignedToId ? new Date() : null,
      assignedBy: req.body.assignedToId ? req.user.id : null,
      createdBy: req.user.id
    };
    
    const prospect = await prisma.prospect.create({
      data: prospectData,
      include: {
        activities: true,
        documentsRel: true,
        notesRel: true
      }
    });
    
    // Créer une entrée d'historique
    await prisma.prospectHistory.create({
      data: {
        prospectId: prospect.id,
        fieldChanged: 'CREATION',
        changeType: 'CREATE',
        oldValue: null,
        newValue: JSON.stringify(prospect),
        changedById: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    
    res.status(201).json({
      success: true,
      data: prospect,
      message: 'Prospect créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Récupérer les anciennes valeurs pour l'historique
    const oldProspect = await prisma.prospect.findUnique({ where: { id } });
    
    // Si changement d'assignation
    if (updateData.assignedToId && updateData.assignedToId !== oldProspect.assignedToId) {
      updateData.assignedAt = new Date();
      updateData.assignedBy = req.user.id;
    }
    
    updateData.updatedBy = req.user.id;
    updateData.version = oldProspect.version + 1;
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: updateData,
      include: {
        activities: {
          orderBy: { scheduledAt: 'desc' },
          take: 10
        },
        documentsRel: {
          take: 5,
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });
    
    // Enregistrer les changements dans l'historique
    const changes = [];
    for (const [key, value] of Object.entries(updateData)) {
      const oldValue = oldProspect[key];
      const newValue = value;
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue) && key !== 'updatedAt' && key !== 'version') {
        changes.push({
          prospectId: id,
          fieldChanged: key,
          changeType: 'UPDATE',
          oldValue: oldValue ? JSON.stringify(oldValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          changedById: req.user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    }
    
    if (changes.length > 0) {
      await prisma.prospectHistory.createMany({
        data: changes
      });
    }
    
    res.json({
      success: true,
      data: prospect,
      message: 'Prospect mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.prospect.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Prospect supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.moveStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;
    
    // Récupérer l'ancien prospect
    const oldProspect = await prisma.prospect.findUnique({ where: { id } });
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: { 
        stage: stage.toUpperCase(),
        updatedAt: new Date(),
        updatedBy: req.user.id,
        version: oldProspect.version + 1
      },
      include: {
        activities: true,
        notesRel: true
      }
    });
    
    // Créer une note si fournie
    if (notes) {
      await prisma.noteProspect.create({
        data: {
          prospectId: id,
          title: `Changement d'étape: ${oldProspect.stage} → ${stage}`,
          content: notes,
          type: 'STATUS_CHANGE',
          createdById: req.user.id
        }
      });
    }
    
    // Enregistrer dans l'historique
    await prisma.prospectHistory.create({
      data: {
        prospectId: id,
        fieldChanged: 'stage',
        changeType: 'STATUS_CHANGE',
        oldValue: oldProspect.stage,
        newValue: stage,
        changedById: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    
    res.json({
      success: true,
      data: prospect,
      message: 'Prospect déplacé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du déplacement du prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déplacement du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.convert = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, conversionReason } = req.body;
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: {
        isConverted: true,
        convertedAt: new Date(),
        convertedBy: req.user.id,
        customerId,
        conversionReason,
        stage: 'GAGNE',
        updatedBy: req.user.id
      }
    });
    
    await prisma.prospectActivity.create({
      data: {
        prospectId: id,
        type: 'REUNION',
        subject: 'Conversion en client',
        description: `Prospect converti en client${conversionReason ? `: ${conversionReason}` : ''}`,
        outcome: 'POSITIF',
        completedAt: new Date(),
        duration: 0,
        createdById: req.user.id,
        isCompleted: true,
        tags: ['conversion']
      }
    });
    
    res.json({
      success: true,
      data: prospect,
      message: 'Prospect converti en client avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la conversion du prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la conversion du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, completed, startDate, endDate } = req.query;
    
    const where = { prospectId: id };
    
    if (type) {
      where.type = type.toUpperCase();
    }
    
    if (completed !== undefined) {
      where.isCompleted = completed === 'true';
    }
    
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }
    
    const activities = await prisma.prospectActivity.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        documents: true
      }
    });
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des activités',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const activityData = {
      prospectId: id,
      ...req.body,
      createdById: req.user.id
    };
    
    // Si une date de planification est fournie, marquer comme non complété
    if (activityData.scheduledAt) {
      activityData.isCompleted = false;
    }
    
    const activity = await prisma.prospectActivity.create({
      data: activityData,
      include: {
        documents: true
      }
    });
    
    // Mettre à jour la date de dernière activité du prospect
    await prisma.prospect.update({
      where: { id },
      data: {
        lastActivityDate: new Date(),
        nextActivityDate: activity.scheduledAt || null
      }
    });
    
    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activité ajoutée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'activité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de l\'activité',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const { id, activityId } = req.params;
    
    const activity = await prisma.prospectActivity.update({
      where: { id: activityId },
      data: {
        ...req.body,
        updatedAt: new Date()
      }
    });
    
    // Si l'activité est marquée comme complétée
    if (req.body.isCompleted && !req.body.completedAt) {
      await prisma.prospectActivity.update({
        where: { id: activityId },
        data: {
          completedAt: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      data: activity,
      message: 'Activité mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'activité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'activité',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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
    const campaignData = {
      ...req.body,
      createdById: req.user.id
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
    
    const assignment = await prisma.sequenceAssignment.create({
      data: {
        sequenceId,
        prospectId: id,
        assignedById: req.user.id,
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

exports.getDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    
    const where = { prospectId: id };
    if (type) {
      where.type = type.toUpperCase();
    }
    
    const documents = await prisma.documentProspect.findMany({
      where,
      orderBy: { uploadedAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const documentData = {
      prospectId: id,
      ...req.body,
      uploadedById: req.user.id,
      uploadedAt: new Date()
    };
    
    const document = await prisma.documentProspect.create({
      data: documentData
    });
    
    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploadé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCompetitors = async (req, res) => {
  try {
    const { id } = req.params;
    
    const competitors = await prisma.competitorProspect.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: competitors
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des concurrents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des concurrents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addCompetitor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const competitor = await prisma.competitorProspect.create({
      data: {
        prospectId: id,
        ...req.body
      }
    });
    
    res.status(201).json({
      success: true,
      data: competitor,
      message: 'Concurrent ajouté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du concurrent:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du concurrent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const history = await prisma.prospectHistory.findMany({
      where: { prospectId: id },
      orderBy: { changedAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getTargets = async (req, res) => {
  try {
    const { period = 'MONTHLY', userId, teamId, year } = req.query;
    
    const where = {
      period: period.toUpperCase(),
      isActive: true
    };
    
    if (userId) where.userId = userId;
    if (teamId) where.teamId = teamId;
    if (year) where.year = parseInt(year);
    
    const targets = await prisma.salesTarget.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    
    res.json({
      success: true,
      data: targets
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des objectifs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des objectifs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Calculer le taux de complétion
    if (updateData.actualRevenue !== undefined && updateData.targetRevenue) {
      updateData.completionRate = (updateData.actualRevenue / updateData.targetRevenue) * 100;
    }
    
    const target = await prisma.salesTarget.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      data: target,
      message: 'Objectif mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objectif:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'objectif',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};