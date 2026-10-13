// Gestion de la modification et l’archivage des clients.
const { prisma, logger, validationResult, syncMissionsFromClientAddress, normalizeOptionalValue, toJsonSafe, parseScopedInteger } = require('./shared');

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

    if (Object.prototype.hasOwnProperty.call(updateData, 'enterpriseId')) {
      updateData.enterpriseId = parseScopedInteger(updateData.enterpriseId);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'serviceId')) {
      updateData.serviceId = parseScopedInteger(updateData.serviceId);
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    // Prepare update data
    const dataToUpdate = Object.fromEntries(
      Object.entries(updateData).map(([key, value]) => [key, normalizeOptionalValue(value)])
    );
    if (dataToUpdate.chiffreAffaireAnnuel) {
      dataToUpdate.chiffreAffaireAnnuel = parseFloat(dataToUpdate.chiffreAffaireAnnuel);
    }
    if (dataToUpdate.effectif) {
      dataToUpdate.effectif = parseInt(dataToUpdate.effectif);
    }
    dataToUpdate.updatedBy = req.user.id;

    const client = await prisma.$transaction(async (tx) => {
      const oldClient = { ...existingClient };

      const updatedClient = await tx.client.update({
        where: { id },
        data: dataToUpdate
      });

      // Calculate differences
      const differences = {};
      Object.keys(dataToUpdate).forEach(key => {
        if (oldClient[key] !== updatedClient[key]) {
          differences[key] = {
            old: oldClient[key],
            new: updatedClient[key]
          };
        }
      });

      // Create historique entry if changes were made
      if (Object.keys(differences).length > 0) {
        await tx.historiqueClient.create({
          data: {
            clientId: id,
            typeChangement: 'MODIFICATION',
            entite: 'CLIENT',
            ancienneValeur: toJsonSafe(oldClient),
            nouvelleValeur: toJsonSafe(updatedClient),
            differences: toJsonSafe(differences),
            modifieParId: req.user.id,
            modifieLe: new Date(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          }
        });
      }

      return updatedClient;
    });

    logger.info('Client mis à jour', {
      clientId: id,
      userId: req.user.id,
      fieldsUpdated: Object.keys(updateData)
    });

    await syncMissionsFromClientAddress(req, id);

    res.json({
      success: true,
      message: 'Client mis à jour avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du client:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Violation de contrainte unique',
        details: error.meta?.target || 'Champ unique déjà utilisé'
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du client',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update client status
 */

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, raison } = req.body;

    const validStatuses = ['PROSPECT', 'ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE', 'LEAD_CHAUD', 'LEAD_FROID'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status invalide',
        validStatuses
      });
    }

    const client = await prisma.$transaction(async (tx) => {
      const oldClient = await tx.client.findUnique({
        where: { id }
      });

      if (!oldClient) {
        throw new Error('Client non trouvé');
      }

      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          status,
          updatedBy: req.user.id,
          ...(status === 'ACTIF' && !oldClient.dateDevenirClient ? {
            dateDevenirClient: new Date()
          } : {})
        }
      });

      // Create historique entry for status change
      await tx.historiqueClient.create({
        data: {
          clientId: id,
          typeChangement: 'STATUT',
          entite: 'CLIENT',
          ancienneValeur: { status: oldClient.status },
          nouvelleValeur: { status: updatedClient.status, raison },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedClient;
    });

    logger.info('Status client mis à jour', {
      clientId: id,
      userId: req.user.id,
      oldStatus: client.status,
      newStatus: status
    });

    res.json({
      success: true,
      message: `Status client mis à jour: ${status}`,
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du status client:', error);

    if (error.message === 'Client non trouvé' || error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update client priority
 */

exports.updatePriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priorite, raison } = req.body;

    const validPriorites = ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];

    if (!validPriorites.includes(priorite)) {
      return res.status(400).json({
        success: false,
        error: 'Priorité invalide',
        validPriorites
      });
    }

    const client = await prisma.$transaction(async (tx) => {
      const oldClient = await tx.client.findUnique({
        where: { id }
      });

      if (!oldClient) {
        throw new Error('Client non trouvé');
      }

      const updatedClient = await tx.client.update({
        where: { id },
        data: {
          priorite,
          updatedBy: req.user.id
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: id,
          typeChangement: 'PRIORITE',
          entite: 'CLIENT',
          ancienneValeur: { priorite: oldClient.priorite },
          nouvelleValeur: { priorite: updatedClient.priorite, raison },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedClient;
    });

    res.json({
      success: true,
      message: `Priorité client mise à jour: ${priorite}`,
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la priorité:', error);

    if (error.message === 'Client non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la priorité',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get client statistics and KPIs
 */

exports.archive = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;

    const client = await prisma.$transaction(async (tx) => {
      const existingClient = await tx.client.findUnique({
        where: { id }
      });

      if (!existingClient) {
        throw new Error('Client non trouvé');
      }

      // Archive client
      const archivedClient = await tx.client.update({
        where: { id },
        data: {
          status: 'ARCHIVE',
          updatedBy: req.user.id
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: id,
          typeChangement: 'ARCHIVAGE',
          entite: 'CLIENT',
          ancienneValeur: existingClient,
          nouvelleValeur: { status: 'ARCHIVE', raison },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return archivedClient;
    });

    logger.info('Client archivé', {
      clientId: id,
      userId: req.user.id,
      raison
    });

    res.json({
      success: true,
      message: 'Client archivé avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de l\'archivage du client:', error);

    if (error.message === 'Client non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Client non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'archivage du client',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Search clients with advanced filtering
 */
