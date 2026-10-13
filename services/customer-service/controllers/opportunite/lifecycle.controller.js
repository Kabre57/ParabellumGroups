// Gestion de cr?ation et modification des opportunit?s.
const { validationResult, prisma, logger } = require('./shared');

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
      nom,
      description,
      montantEstime,
      probabilite,
      dateFermetureEstimee,
      etape,
      statut,
      source,
      commercialId,
      produits
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

    const opportunite = await prisma.$transaction(async (tx) => {
      // Create opportunity
      const newOpportunite = await tx.opportunite.create({
        data: {
          clientId,
          nom,
          description,
          montantEstime: parseFloat(montantEstime),
          probabilite: probabilite ? parseInt(probabilite) : 50,
          dateFermetureEstimee: dateFermetureEstimee ? new Date(dateFermetureEstimee) : null,
          etape: etape || 'PROSPECTION',
          statut: statut || 'OUVERTE',
          source,
          commercialId,
          createdById: req.user.id
        }
      });

      // Create product lines if provided
      if (produits && produits.length > 0) {
        const lignesProduit = produits.map(produit => ({
          opportuniteId: newOpportunite.id,
          produitId: produit.produitId,
          description: produit.description,
          quantite: parseInt(produit.quantite || 1),
          prixUnitaire: parseFloat(produit.prixUnitaire),
          remise: produit.remise ? parseFloat(produit.remise) : null,
          tva: parseFloat(produit.tva || 18),
          montantHT: parseFloat(produit.prixUnitaire) * parseInt(produit.quantite || 1) * (1 - (parseFloat(produit.remise || 0) / 100)),
          montantTTC: parseFloat(produit.prixUnitaire) * parseInt(produit.quantite || 1) * (1 - (parseFloat(produit.remise || 0) / 100)) * (1 + (parseFloat(produit.tva || 18) / 100))
        }));

        await tx.ligneProduit.createMany({
          data: lignesProduit
        });
      }

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId,
          typeChangement: 'CREATION',
          entite: 'OPPORTUNITE',
          entiteId: newOpportunite.id,
          nouvelleValeur: newOpportunite,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return newOpportunite;
    });

    logger.info('Opportunité créée', {
      opportuniteId: opportunite.id,
      clientId,
      userId: req.user.id,
      montant: opportunite.montantEstime
    });

    res.status(201).json({
      success: true,
      message: 'Opportunité créée avec succès',
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la création de l\'opportunité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'opportunité'
    });
  }
};

/**
 * Get opportunity by ID
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

    const existingOpportunite = await prisma.opportunite.findUnique({
      where: { id }
    });

    if (!existingOpportunite) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    // Handle numeric conversions
    if (updateData.montantEstime) {
      updateData.montantEstime = parseFloat(updateData.montantEstime);
    }
    if (updateData.probabilite) {
      updateData.probabilite = parseInt(updateData.probabilite);
    }
    if (updateData.dateFermetureEstimee) {
      updateData.dateFermetureEstimee = new Date(updateData.dateFermetureEstimee);
    }

    const opportunite = await prisma.opportunite.update({
      where: { id },
      data: updateData
    });

    // Create historique entry
    await prisma.historiqueClient.create({
      data: {
        clientId: existingOpportunite.clientId,
        typeChangement: 'MODIFICATION',
        entite: 'OPPORTUNITE',
        entiteId: id,
        nouvelleValeur: opportunite,
        modifieParId: req.user.id,
        modifieLe: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info('Opportunité mise à jour', {
      opportuniteId: id,
      clientId: existingOpportunite.clientId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Opportunité mise à jour avec succès',
      data: opportunite
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'opportunité:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'opportunité'
    });
  }
};

/**
 * Update opportunity stage
 */
