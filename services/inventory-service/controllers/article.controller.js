const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugifyReferenceSegment = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

const buildArticleReference = async ({ categorie, nom }) => {
  const categorySegment = slugifyReferenceSegment(categorie).slice(0, 6) || 'ART';
  const nameSegment = slugifyReferenceSegment(nom).slice(0, 6) || 'ITEM';
  let candidate = '';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    candidate = `${categorySegment}-${nameSegment}-${suffix}`;
    const existing = await prisma.article.findUnique({ where: { reference: candidate } });
    if (!existing) {
      return candidate;
    }
  }

  return `${categorySegment}-${nameSegment}-${Math.floor(Math.random() * 1000000)}`;
};

const normalizeArticlePayload = async (payload, { keepExistingReference = false } = {}) => {
  const reference = typeof payload.reference === 'string' ? payload.reference.trim() : '';
  const normalized = {
    ...payload,
    reference: reference || undefined,
    nom: typeof payload.nom === 'string' ? payload.nom.trim() : payload.nom,
    description: typeof payload.description === 'string' ? payload.description.trim() || null : payload.description,
    categorie: typeof payload.categorie === 'string' ? payload.categorie.trim() || null : payload.categorie,
    emplacement: typeof payload.emplacement === 'string' ? payload.emplacement.trim() || null : payload.emplacement,
  };

  if (!normalized.reference && !keepExistingReference) {
    normalized.reference = await buildArticleReference({
      categorie: normalized.categorie,
      nom: normalized.nom,
    });
  }

  return normalized;
};

exports.createArticle = async (req, res) => {
  try {
    const data = await normalizeArticlePayload(req.body);
    const article = await prisma.article.create({
      data
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
    const data = await normalizeArticlePayload(req.body, { keepExistingReference: true });
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data
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
