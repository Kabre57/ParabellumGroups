const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      stage, 
      assignedToId, 
      priority, 
      search,
      isConverted
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    
    if (stage) {
      where.stage = stage;
    }
    
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (isConverted !== undefined) {
      where.isConverted = isConverted === 'true';
    }
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
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
      details: error.message
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
          orderBy: { createdAt: 'desc' }
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
      details: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const prospectData = {
      ...req.body,
      assignedToId: req.body.assignedToId || req.user.id
    };
    
    const prospect = await prisma.prospect.create({
      data: prospectData,
      include: {
        activities: true
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
      details: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: req.body,
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
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
      details: error.message
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
      details: error.message
    });
  }
};

exports.moveStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: { 
        stage,
        updatedAt: new Date()
      },
      include: {
        activities: true
      }
    });
    
    if (notes) {
      await prisma.prospectActivity.create({
        data: {
          prospectId: id,
          type: 'note',
          subject: `Déplacement vers ${stage}`,
          description: notes,
          completedAt: new Date(),
          createdById: req.user.id
        }
      });
    }
    
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
      details: error.message
    });
  }
};

exports.convert = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId } = req.body;
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: {
        isConverted: true,
        convertedAt: new Date(),
        customerId,
        stage: 'won'
      }
    });
    
    await prisma.prospectActivity.create({
      data: {
        prospectId: id,
        type: 'conversion',
        subject: 'Conversion en client',
        description: 'Prospect converti en client avec succès',
        completedAt: new Date(),
        createdById: req.user.id
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
      details: error.message
    });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const { id } = req.params;
    
    const activities = await prisma.prospectActivity.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: 'desc' }
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
      details: error.message
    });
  }
};

exports.addActivity = async (req, res) => {
  try {
    const { id } = req.params;
    
    const activity = await prisma.prospectActivity.create({
      data: {
        prospectId: id,
        ...req.body,
        createdById: req.user.id
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
      details: error.message
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [
      totalProspects,
      byStage,
      byPriority,
      convertedCount,
      recentActivities
    ] = await Promise.all([
      prisma.prospect.count(),
      prisma.prospect.groupBy({
        by: ['stage'],
        _count: { stage: true }
      }),
      prisma.prospect.groupBy({
        by: ['priority'],
        _count: { priority: true }
      }),
      prisma.prospect.count({ where: { isConverted: true } }),
      prisma.prospectActivity.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      })
    ]);
    
    const byStageMap = byStage.reduce((acc, item) => {
      acc[item.stage] = item._count.stage;
      return acc;
    }, {});
    
    const byPriorityMap = byPriority.reduce((acc, item) => {
      acc[item.priority] = item._count.priority;
      return acc;
    }, {});
    
    const conversionRate = totalProspects > 0 
      ? (convertedCount / totalProspects) * 100 
      : 0;
    
    res.json({
      success: true,
      data: {
        totalProspects,
        convertedProspects: convertedCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        recentActivities,
        byStage: byStageMap,
        byPriority: byPriorityMap
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message
    });
  }
};
