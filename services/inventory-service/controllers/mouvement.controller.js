const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createMouvement = async (req, res) => {
  try {
    const { articleId, type, quantite } = req.body;

    // Créer le mouvement
    const mouvement = await prisma.mouvementStock.create({
      data: req.body
    });

    // Mettre à jour le stock de l'article
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });

    let nouvelleQuantite = article.quantiteStock;
    
    switch (type) {
      case 'ENTREE':
        nouvelleQuantite += quantite;
        break;
      case 'SORTIE':
        nouvelleQuantite -= quantite;
        break;
      case 'AJUSTEMENT':
        nouvelleQuantite = quantite;
        break;
      case 'TRANSFERT':
        nouvelleQuantite -= quantite;
        break;
    }

    await prisma.article.update({
      where: { id: articleId },
      data: { quantiteStock: nouvelleQuantite }
    });

    res.status(201).json(mouvement);
  } catch (error) {
    console.error('Erreur création mouvement:', error);
    res.status(500).json({ error: 'Erreur lors de la création du mouvement' });
  }
};

exports.getAllMouvements = async (req, res) => {
  try {
    const { type, dateDebut, dateFin } = req.query;
    const where = {};

    if (type) where.type = type;
    if (dateDebut || dateFin) {
      where.dateOperation = {};
      if (dateDebut) where.dateOperation.gte = new Date(dateDebut);
      if (dateFin) where.dateOperation.lte = new Date(dateFin);
    }

    const mouvements = await prisma.mouvementStock.findMany({
      where,
      orderBy: { dateOperation: 'desc' },
      include: {
        article: {
          select: {
            reference: true,
            nom: true,
            unite: true
          }
        }
      }
    });
    res.json(mouvements);
  } catch (error) {
    console.error('Erreur récupération mouvements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des mouvements' });
  }
};

exports.getByArticle = async (req, res) => {
  try {
    const mouvements = await prisma.mouvementStock.findMany({
      where: { articleId: req.params.articleId },
      orderBy: { dateOperation: 'desc' }
    });
    res.json(mouvements);
  } catch (error) {
    console.error('Erreur récupération mouvements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des mouvements' });
  }
};

exports.getByType = async (req, res) => {
  try {
    const mouvements = await prisma.mouvementStock.findMany({
      where: { type: req.params.type },
      orderBy: { dateOperation: 'desc' },
      include: {
        article: {
          select: {
            reference: true,
            nom: true
          }
        }
      }
    });
    res.json(mouvements);
  } catch (error) {
    console.error('Erreur récupération mouvements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des mouvements' });
  }
};

exports.cancelMouvement = async (req, res) => {
  try {
    const mouvement = await prisma.mouvementStock.findUnique({
      where: { id: req.params.id }
    });

    if (!mouvement) {
      return res.status(404).json({ error: 'Mouvement non trouvé' });
    }

    // Inverser l'impact sur le stock
    const article = await prisma.article.findUnique({
      where: { id: mouvement.articleId }
    });

    let nouvelleQuantite = article.quantiteStock;
    
    switch (mouvement.type) {
      case 'ENTREE':
        nouvelleQuantite -= mouvement.quantite;
        break;
      case 'SORTIE':
        nouvelleQuantite += mouvement.quantite;
        break;
      case 'TRANSFERT':
        nouvelleQuantite += mouvement.quantite;
        break;
    }

    await prisma.article.update({
      where: { id: mouvement.articleId },
      data: { quantiteStock: nouvelleQuantite }
    });

    // Supprimer le mouvement
    await prisma.mouvementStock.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Mouvement annulé avec succès' });
  } catch (error) {
    console.error('Erreur annulation mouvement:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation du mouvement' });
  }
};
