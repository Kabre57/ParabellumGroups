// Creation, modification et suppression des interactions.
const { prisma, logger, validationResult } = require('./shared');

/**
 * Create a new interaction
 */
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      clientId,
      contactId,
      type,
      canal,
      sujet,
      description,
      dateInteraction,
      dateSuivie,
      dureeMinutes,
      resultat,
      actionRequise,
      participants,
      tags,
      piecesJointes,
      confidential
    } = req.body;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // Verify contact exists if provided
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact non trouvé'
        });
      }
    }

    const interaction = await prisma.interactionClient.create({
      data: {
        clientId,
        contactId,
        type,
        canal,
        sujet,
        description,
        dateInteraction: dateInteraction ? new Date(dateInteraction) : new Date(),
        dateSuivie: dateSuivie ? new Date(dateSuivie) : null,
        dureeMinutes: dureeMinutes ? parseInt(dureeMinutes) : null,
        resultat,
        actionRequise,
        createdById: req.user.id,
        participants: participants || [],
        tags: tags || [],
        piecesJointes: piecesJointes || [],
        confidential: confidential || false
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            raisonSociale: true
          }
        },
        contact: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    // Update client's last interaction date
    await prisma.client.update({
      where: { id: clientId },
      data: {
        dateDerniereInteraction: new Date()
      }
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId,
        typeChangement: 'CREATION',
        entite: 'INTERACTION',
        entiteId: interaction.id,
        nouvelleValeur: interaction,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Interaction créée', {
      interactionId: interaction.id,
      clientId,
      userId: req.user.id,
      type: interaction.type
    });

    res.status(201).json({
      success: true,
      message: 'Interaction créée avec succès',
      data: interaction
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'interaction'
    });
  }
};

/**
 * Update interaction
 */
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const existingInteraction = await prisma.interactionClient.findUnique({
      where: { id }
    });

    if (!existingInteraction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    // Handle date conversions
    if (updateData.dateInteraction) {
      updateData.dateInteraction = new Date(updateData.dateInteraction);
    }
    if (updateData.dateSuivie) {
      updateData.dateSuivie = new Date(updateData.dateSuivie);
    }
    if (updateData.dureeMinutes) {
      updateData.dureeMinutes = parseInt(updateData.dureeMinutes);
    }

    const interaction = await prisma.interactionClient.update({
      where: { id },
      data: updateData
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId: existingInteraction.clientId,
        typeChangement: 'MODIFICATION',
        entite: 'INTERACTION',
        entiteId: id,
        nouvelleValeur: interaction,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Interaction mise à jour', {
      interactionId: id,
      clientId: existingInteraction.clientId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Interaction mise à jour avec succès',
      data: interaction
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'interaction:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'interaction'
    });
  }
};

/**
 * Delete interaction
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.interactionClient.findUnique({
      where: { id }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Create historique entry before deletion
      await tx.historiqueClient.create({
        data: {
          clientId: interaction.clientId,
          typeChangement: 'SUPPRESSION',
          entite: 'INTERACTION',
          entiteId: id,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // Delete the interaction
      await tx.interactionClient.delete({
        where: { id }
      });
    });

    logger.info('Interaction supprimée', {
      interactionId: id,
      clientId: interaction.clientId,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'interaction:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Interaction non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'interaction'
    });
  }
};
