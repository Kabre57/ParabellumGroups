// Association des interactions aux taches de suivi.
const { prisma, logger, validationResult } = require('./shared');

/**
 * Link interaction to task
 */
exports.linkToTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { tacheId } = req.body;

    const interaction = await prisma.interactionClient.findUnique({
      where: { id }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    const tache = await prisma.tacheClient.findUnique({
      where: { id: tacheId }
    });

    if (!tache) {
      return res.status(404).json({
        success: false,
        error: 'Tâche non trouvée'
      });
    }

    const updatedInteraction = await prisma.interactionClient.update({
      where: { id },
      data: {
        tacheLiee: {
          connect: { id: tacheId }
        }
      }
    });

    res.json({
      success: true,
      message: 'Interaction liée à la tâche',
      data: updatedInteraction
    });
  } catch (error) {
    logger.error('Erreur lors de la liaison à la tâche:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la liaison à la tâche'
    });
  }
};
