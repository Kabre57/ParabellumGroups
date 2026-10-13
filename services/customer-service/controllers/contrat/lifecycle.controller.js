// Creation des contrats et gestion de leurs statuts.
const { prisma, logger, generateContratNumber, generateContratReference, validationResult } = require('./shared');

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
      titre,
      description,
      typeContrat,
      dateDebut,
      dateFin,
      dateSignature,
      dateEffet,
      montantHT,
      montantTTC,
      tauxTVA,
      devise,
      periodicitePaiement,
      jourPaiement,
      status,
      estRenouvelable,
      periodeRenouvellement,
      dateProchainRenouvellement,
      preavisRenouvellement,
      conditionsParticulieres,
      signataireId
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

    // Generate unique numbers
    const [numeroContrat, reference] = await Promise.all([
      generateContratNumber(prisma),
      generateContratReference()
    ]);

    const contrat = await prisma.$transaction(async (tx) => {
      const newContrat = await tx.contrat.create({
        data: {
          clientId,
          reference,
          numeroContrat,
          titre,
          description,
          typeContrat,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : null,
          dateSignature: dateSignature ? new Date(dateSignature) : null,
          dateEffet: dateEffet ? new Date(dateEffet) : null,
          montantHT: parseFloat(montantHT),
          montantTTC: parseFloat(montantTTC || montantHT * (1 + (parseFloat(tauxTVA) || 18) / 100)),
          devise: devise || 'XOF',
          tauxTVA: parseFloat(tauxTVA || 18),
          periodicitePaiement,
          jourPaiement: jourPaiement ? parseInt(jourPaiement) : null,
          status: status || 'BROUILLON',
          estRenouvelable: estRenouvelable || false,
          periodeRenouvellement,
          dateProchainRenouvellement: dateProchainRenouvellement ? new Date(dateProchainRenouvellement) : null,
          preavisRenouvellement: preavisRenouvellement ? parseInt(preavisRenouvellement) : null,
          conditionsParticulieres,
          signataireId,
          createdBy: req.user.id
        },
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              raisonSociale: true,
              email: true
            }
          }
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId,
          typeChangement: 'CREATION',
          entite: 'CONTRAT',
          entiteId: newContrat.id,
          nouvelleValeur: newContrat,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return newContrat;
    });

    logger.info('Contrat créé', {
      contratId: contrat.id,
      clientId,
      userId: req.user.id,
      montant: contrat.montantTTC
    });

    res.status(201).json({
      success: true,
      message: 'Contrat créé avec succès',
      data: contrat
    });
  } catch (error) {
    logger.error('Erreur lors de la création du contrat:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Un contrat avec ce numéro existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du contrat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contract by ID
 */

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motif } = req.body;

    const validStatuses = ['BROUILLON', 'EN_ATTENTE_SIGNATURE', 'ACTIF', 'SUSPENDU', 'RESILIE', 'TERMINE', 'EN_RENOUVELLEMENT'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status invalide',
        validStatuses
      });
    }

    const contrat = await prisma.$transaction(async (tx) => {
      const oldContrat = await tx.contrat.findUnique({
        where: { id },
        include: { client: true }
      });

      if (!oldContrat) {
        throw new Error('Contrat non trouvé');
      }

      const updateData = { status };
      if (motif) {
        if (status === 'SUSPENDU') updateData.motifSuspension = motif;
        if (status === 'RESILIE') updateData.motifResiliation = motif;
      }

      const updatedContrat = await tx.contrat.update({
        where: { id },
        data: updateData
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: oldContrat.clientId,
          typeChangement: 'STATUT',
          entite: 'CONTRAT',
          entiteId: id,
          ancienneValeur: { status: oldContrat.status },
          nouvelleValeur: { status: updatedContrat.status, motif },
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return updatedContrat;
    });

    logger.info('Status contrat mis à jour', {
      contratId: id,
      userId: req.user.id,
      oldStatus: contrat.status,
      newStatus: status
    });

    res.json({
      success: true,
      message: `Status contrat mis à jour: ${status}`,
      data: contrat
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du status:', error);

    if (error.message === 'Contrat non trouvé' || error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Contrat non trouvé'
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
 * Get contract statistics
 */
