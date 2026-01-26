const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createArticle = async (req, res) => {
  try {
    const article = await prisma.article.create({
      data: req.body
    });
    res.status(201).json(article);
  } catch (error) {
    console.error('Erreur création article:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
  }
};

exports.getAllArticles = async (req, res) => {
  try {
    const { status, categorie, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (categorie) where.categorie = categorie;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } }
      ];
    }

    const articles = await prisma.article.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(articles);
  } catch (error) {
    console.error('Erreur récupération articles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
  }
};

exports.getArticleById = async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: {
        mouvements: {
          orderBy: { dateOperation: 'desc' },
          take: 10
        }
      }
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    
    res.json(article);
  } catch (error) {
    console.error('Erreur récupération article:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article' });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(article);
  } catch (error) {
    console.error('Erreur mise à jour article:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'article' });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    await prisma.article.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression article:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
  }
};

exports.getAlertes = async (req, res) => {
  try {
    const alertesRupture = await prisma.article.findMany({
      where: {
        status: 'ACTIF',
        quantiteStock: {
          lte: prisma.article.fields.seuilRupture
        }
      }
    });

    const alertesAlerte = await prisma.article.findMany({
      where: {
        status: 'ACTIF',
        quantiteStock: {
          lte: prisma.article.fields.seuilAlerte,
          gt: prisma.article.fields.seuilRupture
        }
      }
    });

    res.json({
      rupture: alertesRupture,
      alerte: alertesAlerte,
      total: alertesRupture.length + alertesAlerte.length
    });
  } catch (error) {
    console.error('Erreur récupération alertes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
  }
};

exports.getValeurStock = async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      where: { status: 'ACTIF' }
    });

    const valeurAchat = articles.reduce((sum, a) => sum + (a.quantiteStock * a.prixAchat), 0);
    const valeurVente = articles.reduce((sum, a) => sum + (a.quantiteStock * a.prixVente), 0);
    const nbArticles = articles.length;
    const nbArticlesEnStock = articles.filter(a => a.quantiteStock > 0).length;

    res.json({
      valeurAchat,
      valeurVente,
      nbArticles,
      nbArticlesEnStock,
      margeTheorique: valeurVente - valeurAchat
    });
  } catch (error) {
    console.error('Erreur calcul valeur stock:', error);
    res.status(500).json({ error: 'Erreur lors du calcul de la valeur du stock' });
  }
};

exports.getMouvements = async (req, res) => {
  try {
    const mouvements = await prisma.mouvementStock.findMany({
      where: { articleId: req.params.id },
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
