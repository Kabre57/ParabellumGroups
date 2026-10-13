// Creation, modification et suppression du parc materiel.
const { prisma, isForceDelete } = require('./shared');

exports.create = async (req, res) => {
  try {
    const {
      reference,
      nom,
      description,
      categorie,
      quantiteStock,
      seuilAlerte,
      seuilRupture,
      prixUnitaire,
      fournisseur,
      emplacementStock,
      notes
    } = req.body;

    if (!reference || !nom || !categorie) {
      return res.status(400).json({
        success: false,
        error: 'Les champs reference, nom et categorie sont requis'
      });
    }

    const materiel = await prisma.materiel.create({
      data: {
        reference,
        nom,
        description,
        categorie,
        quantiteStock: quantiteStock || 0,
        seuilAlerte: seuilAlerte || 10,
        seuilRupture: seuilRupture || 5,
        prixUnitaire,
        fournisseur,
        emplacementStock,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Matériel créé avec succès',
      data: materiel
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Un matériel avec cette référence existe déjà'
      });
    }
    console.error('Error in create materiel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du matériel'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const materiel = await prisma.materiel.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Matériel mis à jour avec succès',
      data: materiel
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Un matériel avec cette référence existe déjà'
      });
    }
    console.error('Error in update materiel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du matériel'
    });
  }
};

/**
 * Supprime un matériel
 */

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = isForceDelete(req);

    // Vérifier si le matériel existe
    const materiel = await prisma.materiel.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sorties: true
          }
        }
      }
    });

    if (!materiel) {
      return res.status(404).json({
        success: false,
        error: 'Matériel non trouvé'
      });
    }

    if ((materiel._count?.sorties || 0) > 0 && !forceDelete) {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer un matériel déjà utilisé dans une ou plusieurs sorties'
      });
    }

    if ((materiel._count?.sorties || 0) > 0 && forceDelete) {
      await prisma.sortieMateriel.deleteMany({
        where: { materielId: id }
      });
    }

    await prisma.materiel.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Matériel supprimé avec succès'
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'Impossible de supprimer un matériel encore référencé'
      });
    }
    console.error('Error in delete materiel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du matériel'
    });
  }
};

/**
 * Gestion des sorties de matériel
 */
