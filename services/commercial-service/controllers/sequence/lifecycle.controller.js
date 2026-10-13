// Creation, modification et suppression des sequences.
const { prisma } = require('./shared');

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
