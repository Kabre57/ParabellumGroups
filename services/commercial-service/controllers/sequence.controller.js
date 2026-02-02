const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

exports.createSequence = async (req, res) => {
  try {
    const sequenceData = {
      ...req.body,
      createdById: req.user.id,
      totalSteps: req.body.steps ? req.body.steps.length : 0
    };
    
    const sequence = await prisma.prospectionSequence.create({
      data: sequenceData
    });
    
    // Créer les étapes si fournies
    if (req.body.steps && req.body.steps.length > 0) {
      const steps = req.body.steps.map((step, index) => ({
        sequenceId: sequence.id,
        stepNumber: index + 1,
        name: step.name,
        description: step.description,
        actionType: step.actionType.toUpperCase(),
        templateId: step.templateId,
        delayDays: step.delayDays || 1,
        delayType: step.delayType || 'AFTER_PREVIOUS',
        conditions: step.conditions,
        isActive: step.isActive !== false
      }));
      
      await prisma.sequenceStep.createMany({
        data: steps
      });
      
      // Mettre à jour le nombre total d'étapes
      await prisma.prospectionSequence.update({
        where: { id: sequence.id },
        data: { totalSteps: steps.length }
      });
    }
    
    const createdSequence = await prisma.prospectionSequence.findUnique({
      where: { id: sequence.id },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      data: createdSequence,
      message: 'Séquence créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la séquence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la séquence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateSequence = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sequence = await prisma.prospectionSequence.update({
      where: { id },
      data: req.body
    });
    
    res.json({
      success: true,
      data: sequence,
      message: 'Séquence mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la séquence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la séquence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteSequence = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.prospectionSequence.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Séquence supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la séquence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la séquence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addStep = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le dernier numéro d'étape
    const lastStep = await prisma.sequenceStep.findFirst({
      where: { sequenceId: id },
      orderBy: { stepNumber: 'desc' }
    });
    
    const stepNumber = lastStep ? lastStep.stepNumber + 1 : 1;
    
    const stepData = {
      sequenceId: id,
      stepNumber,
      ...req.body,
      actionType: req.body.actionType.toUpperCase()
    };
    
    const step = await prisma.sequenceStep.create({
      data: stepData
    });
    
    // Mettre à jour le nombre total d'étapes
    await prisma.prospectionSequence.update({
      where: { id },
      data: {
        totalSteps: { increment: 1 }
      }
    });
    
    res.status(201).json({
      success: true,
      data: step,
      message: 'Étape ajoutée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'étape:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de l\'étape',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateStep = async (req, res) => {
  try {
    const { id, stepId } = req.params;
    
    const step = await prisma.sequenceStep.update({
      where: { id: stepId },
      data: req.body
    });
    
    res.json({
      success: true,
      data: step,
      message: 'Étape mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'étape:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'étape',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteStep = async (req, res) => {
  try {
    const { id, stepId } = req.params;
    
    await prisma.sequenceStep.delete({
      where: { id: stepId }
    });
    
    // Réorganiser les numéros d'étape
    const steps = await prisma.sequenceStep.findMany({
      where: { sequenceId: id },
      orderBy: { stepNumber: 'asc' }
    });
    
    // Mettre à jour les numéros d'étape
    for (let i = 0; i < steps.length; i++) {
      await prisma.sequenceStep.update({
        where: { id: steps[i].id },
        data: { stepNumber: i + 1 }
      });
    }
    
    // Mettre à jour le nombre total d'étapes
    await prisma.prospectionSequence.update({
      where: { id },
      data: {
        totalSteps: steps.length
      }
    });
    
    res.json({
      success: true,
      message: 'Étape supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'étape:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'étape',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.assignProspects = async (req, res) => {
  try {
    const { id } = req.params;
    const { prospectIds } = req.body;
    
    const assignments = prospectIds.map(prospectId => ({
      sequenceId: id,
      prospectId,
      assignedById: req.user.id,
      status: 'ACTIVE',
      startedAt: new Date(),
      currentStep: 1
    }));
    
    await prisma.sequenceAssignment.createMany({
      data: assignments,
      skipDuplicates: true
    });
    
    res.json({
      success: true,
      message: `${prospectIds.length} prospects assignés à la séquence`
    });
  } catch (error) {
    console.error('Erreur lors de l\'assignation des prospects:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'assignation des prospects',
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

exports.executeNextStep = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const assignment = await prisma.sequenceAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        sequence: {
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' }
            }
          }
        },
        prospect: true
      }
    });
    
    if (!assignment) {
      return res.status(404).json({
        success: true,
        error: 'Assignation non trouvée'
      });
    }
    
    // Vérifier si la séquence est terminée
    if (assignment.currentStep > assignment.sequence.totalSteps) {
      await prisma.sequenceAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
      
      return res.json({
        success: true,
        message: 'Séquence terminée',
        data: { status: 'COMPLETED' }
      });
    }
    
    // Récupérer l'étape courante
    const currentStep = assignment.sequence.steps.find(
      step => step.stepNumber === assignment.currentStep
    );
    
    if (!currentStep) {
      return res.status(400).json({
        success: false,
        error: 'Étape non trouvée'
      });
    }
    
    // Créer l'activité pour cette étape
    const activity = await prisma.sequenceActivity.create({
      data: {
        assignmentId,
        stepId: currentStep.id,
        stepNumber: currentStep.stepNumber,
        actionType: currentStep.actionType,
        status: 'PENDING',
        scheduledAt: new Date(Date.now() + (currentStep.delayDays * 24 * 60 * 60 * 1000))
      }
    });
    
    // Mettre à jour l'assignation
    const updatedAssignment = await prisma.sequenceAssignment.update({
      where: { id: assignmentId },
      data: {
        lastActivityAt: new Date(),
        nextStepScheduledAt: activity.scheduledAt
      }
    });
    
    res.json({
      success: true,
      data: {
        assignment: updatedAssignment,
        activity,
        currentStep
      },
      message: 'Étape planifiée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'exécution de l\'étape suivante:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'exécution de l\'étape suivante',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};