const { PrismaClient } = require('@prisma/client');
const { generateInventaireNumber } = require('../utils/inventaireNumberGenerator');
const prisma = new PrismaClient();

exports.createInventaire = async (req, res) => {
  try {
    const numeroInventaire = await generateInventaireNumber();
    
    const inventaire = await prisma.inventaire.create({
      data: {
        ...req.body,
        numeroInventaire
      }
    });
    res.status(201).json(inventaire);
  } catch (error) {
    console.error('Erreur création inventaire:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'inventaire' });
  }
};

exports.getAllInventaires = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const inventaires = await prisma.inventaire.findMany({
      where,
      orderBy: { dateDebut: 'desc' },
      include: {
        lignes: {
          select: {
            id: true
          }
        }
      }
    });

    const result = inventaires.map(inv => ({
      ...inv,
      nbLignes: inv.lignes.length,
      lignes: undefined
    }));

    res.json(result);
  } catch (error) {
    console.error('Erreur récupération inventaires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des inventaires' });
  }
};

exports.getInventaireById = async (req, res) => {
  try {
    const inventaire = await prisma.inventaire.findUnique({
      where: { id: req.params.id },
      include: {
        lignes: {
          include: {
            article: {
              select: {
                reference: true,
                nom: true,
                unite: true,
                prixAchat: true
              }
            }
          }
        }
      }
    });
    
    if (!inventaire) {
      return res.status(404).json({ error: 'Inventaire non trouvé' });
    }
    
    res.json(inventaire);
  } catch (error) {
    console.error('Erreur récupération inventaire:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'inventaire' });
  }
};

exports.updateInventaire = async (req, res) => {
  try {
    const inventaire = await prisma.inventaire.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(inventaire);
  } catch (error) {
    console.error('Erreur mise à jour inventaire:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'inventaire' });
  }
};

exports.deleteInventaire = async (req, res) => {
  try {
    await prisma.inventaire.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression inventaire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'inventaire' });
  }
};

exports.addLigne = async (req, res) => {
  try {
    const { inventaireId } = req.params;
    const ligne = await prisma.ligneInventaire.create({
      data: {
        ...req.body,
        inventaireId
      },
      include: {
        article: true
      }
    });

    // Mettre à jour le nombre d'articles
    const count = await prisma.ligneInventaire.count({
      where: { inventaireId }
    });

    await prisma.inventaire.update({
      where: { id: inventaireId },
      data: { nbArticles: count }
    });

    res.status(201).json(ligne);
  } catch (error) {
    console.error('Erreur ajout ligne inventaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la ligne d\'inventaire' });
  }
};

exports.startInventaire = async (req, res) => {
  try {
    const inventaire = await prisma.inventaire.update({
      where: { id: req.params.id },
      data: {
        status: 'EN_COURS',
        dateDebut: new Date()
      }
    });
    res.json(inventaire);
  } catch (error) {
    console.error('Erreur démarrage inventaire:', error);
    res.status(500).json({ error: 'Erreur lors du démarrage de l\'inventaire' });
  }
};

exports.closeInventaire = async (req, res) => {
  try {
    // Calculer les écarts
    const lignes = await prisma.ligneInventaire.findMany({
      where: { inventaireId: req.params.id },
      include: { article: true }
    });

    let nbEcarts = 0;
    let montantEcart = 0;

    for (const ligne of lignes) {
      const ecart = ligne.quantiteReelle - ligne.quantiteTheorique;
      const valeurEcart = ecart * ligne.article.prixAchat;

      await prisma.ligneInventaire.update({
        where: { id: ligne.id },
        data: {
          ecart,
          valeurEcart
        }
      });

      if (ecart !== 0) nbEcarts++;
      montantEcart += Math.abs(valeurEcart);
    }

    const inventaire = await prisma.inventaire.update({
      where: { id: req.params.id },
      data: {
        status: 'TERMINE',
        dateFin: new Date(),
        nbEcarts,
        montantEcart
      }
    });

    res.json(inventaire);
  } catch (error) {
    console.error('Erreur clôture inventaire:', error);
    res.status(500).json({ error: 'Erreur lors de la clôture de l\'inventaire' });
  }
};

exports.validateInventaire = async (req, res) => {
  try {
    // Appliquer les ajustements de stock
    const lignes = await prisma.ligneInventaire.findMany({
      where: { inventaireId: req.params.id },
      include: { article: true }
    });

    for (const ligne of lignes) {
      if (ligne.ecart !== 0) {
        // Mettre à jour le stock
        await prisma.article.update({
          where: { id: ligne.articleId },
          data: { quantiteStock: ligne.quantiteReelle }
        });

        // Créer un mouvement d'ajustement
        await prisma.mouvementStock.create({
          data: {
            articleId: ligne.articleId,
            type: 'AJUSTEMENT',
            quantite: ligne.quantiteReelle,
            utilisateurId: req.body.utilisateurId || 'SYSTEM',
            numeroDocument: `INV-${ligne.inventaireId}`,
            notes: `Ajustement suite à inventaire - Écart: ${ligne.ecart}`
          }
        });
      }
    }

    const inventaire = await prisma.inventaire.update({
      where: { id: req.params.id },
      data: { status: 'VALIDE' }
    });

    res.json(inventaire);
  } catch (error) {
    console.error('Erreur validation inventaire:', error);
    res.status(500).json({ error: 'Erreur lors de la validation de l\'inventaire' });
  }
};

exports.getEcarts = async (req, res) => {
  try {
    const lignes = await prisma.ligneInventaire.findMany({
      where: {
        inventaireId: req.params.id,
        ecart: {
          not: 0
        }
      },
      include: {
        article: {
          select: {
            reference: true,
            nom: true,
            unite: true,
            prixAchat: true
          }
        }
      },
      orderBy: {
        valeurEcart: 'desc'
      }
    });

    const stats = {
      nbEcarts: lignes.length,
      montantTotal: lignes.reduce((sum, l) => sum + Math.abs(l.valeurEcart), 0),
      ecartPositif: lignes.filter(l => l.ecart > 0).length,
      ecartNegatif: lignes.filter(l => l.ecart < 0).length
    };

    res.json({ lignes, stats });
  } catch (error) {
    console.error('Erreur récupération écarts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des écarts' });
  }
};
