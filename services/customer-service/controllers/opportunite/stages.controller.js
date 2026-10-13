// Gestion de changement d??tape et cl?ture.
const { generateContratNumber, prisma, logger } = require('./shared');

exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { etape, notes } = req.body;

    const validEtapes = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FINALISATION'];

    if (!validEtapes.includes(etape)) {
      return res.status(400).json({
        success: false,
        error: 'Étape invalide',
        validEtapes
      });
    }

    const opportunite = await prisma.$transaction(async (tx) => {
      const existingOpportunite = await tx.opportunite.findUnique({
        where: { id }
      });

      if (!existingOpportunite) {
        throw new Error('Opportunité non trouvée');
      }

      const updatedOpportunite = await tx.opportunite.update({
        where: { id },
        data: { etape }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: existingOpportunite.clientId,
          typeChangement: 'ETAPE',
          entite: 'OPPORTUNITE',
          entiteId: id,
          ancienneValeur: { etape: existingOpportunite.etape },
          nouvelleValeur: { etape: updatedOpportunite.etape, notes },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedOpportunite;
    });

    res.json({
      success: true,
      message: `Étape mise à jour: ${etape}`,
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'étape:', error);

    if (error.message === 'Opportunité non trouvée') {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'étape'
    });
  }
};

/**
 * Close opportunity (won/lost)
 */

exports.close = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, raisonPerdue, montantFinal } = req.body;

    if (!['GAGNEE', 'PERDUE'].includes(statut)) {
      return res.status(400).json({
        success: false,
        error: 'Statut invalide pour fermeture',
        validStatuts: ['GAGNEE', 'PERDUE']
      });
    }

    const opportunite = await prisma.$transaction(async (tx) => {
      const existingOpportunite = await tx.opportunite.findUnique({
        where: { id }
      });

      if (!existingOpportunite) {
        throw new Error('Opportunité non trouvée');
      }

      const updateData = { statut };
      if (statut === 'PERDUE') updateData.raisonPerdue = raisonPerdue;
      if (montantFinal) updateData.montantEstime = parseFloat(montantFinal);

      const updatedOpportunite = await tx.opportunite.update({
        where: { id },
        data: updateData
      });

      // If won, update client status and create contract if montantFinal provided
      if (statut === 'GAGNEE' && montantFinal) {
        await tx.client.update({
          where: { id: existingOpportunite.clientId },
          data: {
            status: 'ACTIF',
            dateDevenirClient: new Date()
          }
        });

        // Create a contract from the opportunity
        const numeroContrat = await generateContratNumber(tx);
        const reference = await generateContratReference();

        await tx.contrat.create({
          data: {
            clientId: existingOpportunite.clientId,
            reference,
            numeroContrat,
            titre: `Contrat - ${existingOpportunite.nom}`,
            description: `Créé à partir de l'opportunité: ${existingOpportunite.nom}`,
            typeContrat: 'SERVICE',
            dateDebut: new Date(),
            montantHT: parseFloat(montantFinal) / 1.18,
            montantTTC: parseFloat(montantFinal),
            devise: 'XOF',
            tauxTVA: 18,
            status: 'EN_ATTENTE_SIGNATURE',
            createdBy: req.user.id
          }
        });
      }

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: existingOpportunite.clientId,
          typeChangement: 'FERMETURE',
          entite: 'OPPORTUNITE',
          entiteId: id,
          ancienneValeur: { statut: existingOpportunite.statut },
          nouvelleValeur: { statut: updatedOpportunite.statut, raisonPerdue, montantFinal },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedOpportunite;
    });

    logger.info('Opportunité fermée', {
      opportuniteId: id,
      statut,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: `Opportunité ${statut === 'GAGNEE' ? 'gagnée' : 'perdue'}`,
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la fermeture de l\'opportunité:', error);

    if (error.message === 'Opportunité non trouvée') {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la fermeture de l\'opportunité'
    });
  }
};

/**
 * Add product line to opportunity
 */
