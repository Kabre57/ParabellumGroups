const { scopedPrisma } = require('../../utils/scopedPrisma');
const { respondScopeError } = require('../../utils/enterpriseScope');
// Association des interactions aux taches de suivi.
const { prisma, logger, validationResult } = require('./shared');

/**
 * Link interaction to task
 */
exports.linkToTask = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;
    const { tacheId } = req.body;

    const interaction = await scoped.interactionClient.findUnique({
      where: { id }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    const tache = await scoped.tacheClient.findUnique({
      where: { id: tacheId }
    });

    if (!tache) {
      return res.status(404).json({
        success: false,
        error: 'Tâche non trouvée'
      });
    }

    const updatedInteraction = await scoped.interactionClient.update({
      where: { id },
      data: {
        tacheLieeId: tacheId
      }
    });

    res.json({
      success: true,
      message: 'Interaction liée à la tâche',
      data: updatedInteraction
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la liaison à la tâche:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la liaison à la tâche'
    });
  }
};
