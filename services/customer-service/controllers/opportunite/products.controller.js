// Gestion de gestion des produits associ?s.
const { prisma, logger } = require('./shared');

exports.addProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    const opportunite = await prisma.opportunite.findUnique({
      where: { id }
    });

    if (!opportunite) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    const ligneProduit = await prisma.ligneProduit.create({
      data: {
        opportuniteId: id,
        produitId: productData.produitId,
        description: productData.description,
        quantite: parseInt(productData.quantite || 1),
        prixUnitaire: parseFloat(productData.prixUnitaire),
        remise: productData.remise ? parseFloat(productData.remise) : null,
        tva: parseFloat(productData.tva || 18),
        montantHT: parseFloat(productData.prixUnitaire) * parseInt(productData.quantite || 1) * (1 - (parseFloat(productData.remise || 0) / 100)),
        montantTTC: parseFloat(productData.prixUnitaire) * parseInt(productData.quantite || 1) * (1 - (parseFloat(productData.remise || 0) / 100)) * (1 + (parseFloat(productData.tva || 18) / 100))
      }
    });

    // Recalculate opportunity amount
    const totalProduits = await prisma.ligneProduit.aggregate({
      where: { opportuniteId: id },
      _sum: {
        montantTTC: true
      }
    });

    await prisma.opportunite.update({
      where: { id },
      data: {
        montantEstime: totalProduits._sum.montantTTC || 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'Produit ajouté à l\'opportunité',
      data: ligneProduit
    });
  } catch (error) {
    logger.error('Erreur lors de l\'ajout du produit:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du produit'
    });
  }
};

/**
 * Get opportunity pipeline statistics
 */
