// Configuration et execution des etapes de prospection.
const { prisma } = require('./shared');

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
