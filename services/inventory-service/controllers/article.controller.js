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
    imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl.trim() || null : payload.imageUrl,
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

const normalizeImportKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const normalizeImportValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
};

const buildImportRowMap = (row) =>
  Object.entries(row || {}).reduce((map, [key, value]) => {
    map[normalizeImportKey(key)] = value;
    return map;
  }, {});

const pickImportValue = (rowMap, aliases) => {
  for (const alias of aliases) {
    const value = normalizeImportValue(rowMap[normalizeImportKey(alias)]);
    if (value !== undefined) return value;
  }

  return undefined;
};

const parseImportNumber = (value, fieldName) => {
  const normalized = normalizeImportValue(value);
  if (normalized === undefined) return undefined;
  const parsed = Number(normalized.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} doit etre un nombre valide`);
  }
  return parsed;
};

const parseImportEnum = (value, allowedValues, fieldName) => {
  const normalized = normalizeImportValue(value);
  if (normalized === undefined) return undefined;
  const candidate = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!allowedValues.includes(candidate)) {
    throw new Error(`${fieldName} invalide: ${normalized}`);
  }

  return candidate;
};

const parseImportUnit = (value) => {
  const normalized = normalizeImportValue(value);
  if (normalized === undefined) return undefined;
  const key = normalizeImportKey(normalized);
  const aliases = {
    piece: 'PIECE',
    pieces: 'PIECE',
    pce: 'PIECE',
    pc: 'PIECE',
    unite: 'PIECE',
    kg: 'KG',
    kilo: 'KG',
    kilos: 'KG',
    kilogramme: 'KG',
    kilogrammes: 'KG',
    m: 'M',
    metre: 'M',
    metres: 'M',
    l: 'L',
    litre: 'L',
    litres: 'L',
  };

  if (!aliases[key]) {
    throw new Error(`Unite invalide: ${normalized}`);
  }

  return aliases[key];
};

const compactImportData = (data) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});

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

exports.importArticles = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  const updateExisting = req.body?.options?.updateExisting !== false;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Aucune ligne produit a importer'
    });
  }

  const result = {
    total: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (const [index, row] of items.entries()) {
    const rowNumber = index + 2;

    try {
      if (!row || typeof row !== 'object') {
        throw new Error('Ligne invalide');
      }

      const rowMap = buildImportRowMap(row);
      const reference = pickImportValue(rowMap, ['reference', 'ref', 'code']);
      const nom = pickImportValue(rowMap, ['nom', 'produit', 'designation', 'name']);
      const categorie = pickImportValue(rowMap, ['categorie', 'category', 'famille']);

      if (!nom) {
        throw new Error('Le nom est requis');
      }

      const existingArticle = reference
        ? await prisma.article.findUnique({ where: { reference } })
        : null;

      if (existingArticle && !updateExisting) {
        result.skipped += 1;
        continue;
      }

      if (!existingArticle && !categorie) {
        throw new Error('La categorie est requise pour un nouveau produit');
      }

      const data = compactImportData({
        reference: existingArticle
          ? reference
          : reference || await buildArticleReference({ categorie, nom }),
        nom,
        imageUrl: pickImportValue(rowMap, ['imageUrl', 'image url', 'image']),
        description: pickImportValue(rowMap, ['description']),
        categorie,
        unite: parseImportUnit(pickImportValue(rowMap, ['unite', 'unit'])),
        prixAchat: parseImportNumber(pickImportValue(rowMap, ['prixAchat', 'prix achat', 'cout achat']), 'Prix achat'),
        prixVente: parseImportNumber(pickImportValue(rowMap, ['prixVente', 'prix vente', 'prix public']), 'Prix vente'),
        quantiteStock: parseImportNumber(pickImportValue(rowMap, ['quantiteStock', 'quantite stock', 'stock', 'quantite']), 'Quantite stock'),
        seuilAlerte: parseImportNumber(pickImportValue(rowMap, ['seuilAlerte', 'seuil alerte']), 'Seuil alerte'),
        seuilRupture: parseImportNumber(pickImportValue(rowMap, ['seuilRupture', 'seuil rupture']), 'Seuil rupture'),
        emplacement: pickImportValue(rowMap, ['emplacement', 'localisation']),
        fournisseurId: pickImportValue(rowMap, ['fournisseurId', 'fournisseur id', 'supplier id']),
        status: parseImportEnum(
          pickImportValue(rowMap, ['status', 'statut']),
          ['ACTIF', 'INACTIF', 'OBSOLETE'],
          'Statut'
        ) || (existingArticle ? undefined : 'ACTIF'),
      });

      if (existingArticle) {
        await prisma.article.update({
          where: { id: existingArticle.id },
          data
        });
        result.updated += 1;
      } else {
        await prisma.article.create({
          data
        });
        result.created += 1;
      }
    } catch (error) {
      result.skipped += 1;
      result.errors.push({
        row: rowNumber,
        message: error.code === 'P2002'
          ? `Valeur deja utilisee: ${error.meta?.target || 'champ unique'}`
          : error.message
      });
    }
  }

  res.json({
    success: result.errors.length === 0,
    message: 'Import produits termine',
    data: result
  });
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
