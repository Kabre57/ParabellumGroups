// Consultation et statistiques des sequences.
const { prisma } = require('./shared');

/**
 * Contrôleur pour la gestion des séquences automatisées
 */
exports.getAllSequences = async (req, res) => {
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

exports.getSequenceById = async (req, res) => {
  try {
    const { id } = req.params;

    const sequence = await prisma.prospectionSequence.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            _count: {
              select: { activities: true }
            }
          }
        },
        assignedProspects: {
          include: {
            prospect: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                stage: true,
                score: true
              }
            },
            activities: {
              orderBy: { scheduledAt: 'asc' },
              take: 5
            }
          },
          take: 10,
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Séquence non trouvée'
      });
    }

    res.json({
      success: true,
      data: sequence
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la séquence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la séquence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getSequenceStats = async (req, res) => {
  try {
    const { id } = req.params;

    const sequence = await prisma.prospectionSequence.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignedProspects: true
          }
        },
        assignedProspects: {
          include: {
            prospect: true,
            activities: {
              where: {
                status: 'COMPLETED'
              }
            }
          }
        }
      }
    });

    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Séquence non trouvée'
      });
    }

    const stats = {
      totalAssignments: sequence._count.assignedProspects,
      active: sequence.assignedProspects.filter(a => a.status === 'ACTIVE').length,
      completed: sequence.assignedProspects.filter(a => a.status === 'COMPLETED').length,
      paused: sequence.assignedProspects.filter(a => a.status === 'PAUSED').length,
      stopped: sequence.assignedProspects.filter(a => a.status === 'STOPPED').length,

      // Conversion rate
      conversions: sequence.assignedProspects.filter(a =>
        a.prospect.isConverted
      ).length,

      // Average steps completed
      avgStepsCompleted: sequence.assignedProspects.reduce((sum, a) =>
        sum + a.completedSteps, 0
      ) / sequence.assignedProspects.length || 0,

      // By prospect stage
      byStage: sequence.assignedProspects.reduce((acc, a) => {
        const stage = a.prospect.stage;
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        sequence,
        stats
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de séquence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques de séquence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
