const { scopedPrisma } = require('../../utils/scopedPrisma');
const { respondScopeError } = require('../../utils/enterpriseScope');
// Creation des avenants associes aux contrats clients.
const { prisma, logger } = require('./shared');

exports.createAvenant = async (req, res) => {
  try {
    const scoped = await scopedPrisma(req, prisma);
    const { id } = req.params;
    const {
      numeroAvenant,
      description,
      modifications,
      dateEffet,
      dateSignature,
      montantAdditionnel
    } = req.body;

    const contrat = await scoped.contrat.findUnique({
      where: { id }
    });

    if (!contrat) {
      return res.status(404).json({
        success: false,
        error: 'Contrat non trouvé'
      });
    }

    const avenant = await scoped.$transaction(async (tx) => {
      // Get last avenant number
      const lastAvenant = await tx.avenantContrat.findFirst({
        where: { contratId: id },
        orderBy: { numeroAvenant: 'desc' }
      });

      const avenantNumber = numeroAvenant ||
        `AV${String(parseInt(lastAvenant?.numeroAvenant.replace('AV', '') || '0') + 1).padStart(3, '0')}`;

      const newAvenant = await tx.avenantContrat.create({
        data: {
          contratId: id,
          numeroAvenant: avenantNumber,
          description,
          modifications,
          dateEffet: new Date(dateEffet),
          dateSignature: dateSignature ? new Date(dateSignature) : null,
          montantAdditionnel: montantAdditionnel ? parseFloat(montantAdditionnel) : null,
          createdBy: req.user.id
        }
      });

      // Update contract amount if montantAdditionnel provided
      if (montantAdditionnel) {
        await tx.contrat.update({
          where: { id },
          data: {
            montantTTC: contrat.montantTTC.plus(parseFloat(montantAdditionnel))
          }
        });
      }

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: contrat.clientId,
          typeChangement: 'CREATION',
          entite: 'AVENANT',
          entiteId: newAvenant.id,
          nouvelleValeur: newAvenant,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return newAvenant;
    });

    logger.info('Avenant créé', {
      avenantId: avenant.id,
      contratId: id,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Avenant créé avec succès',
      data: avenant
    });
  } catch (error) {
    if (respondScopeError(res, error)) return;
    logger.error('Erreur lors de la création de l\'avenant:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'avenant',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contracts expiring soon
 */
