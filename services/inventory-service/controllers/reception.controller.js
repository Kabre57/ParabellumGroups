const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateNumero = () => {
  const now = new Date();
  return `RC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
};

exports.createReception = async (req, res) => {
  try {
    const { bonCommandeId, fournisseurId, notes, lignes = [] } = req.body;

    if (!bonCommandeId || !Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: 'bonCommandeId et au moins une ligne sont requis' });
    }

    // Valider la présence d'un article pour chaque ligne et son existence en base
    if (lignes.some((l) => !l.articleId)) {
      return res.status(400).json({ error: 'Chaque ligne doit avoir un articleId' });
    }

    const articleIds = lignes.map((l) => l.articleId);
    const articles = await prisma.article.findMany({ where: { id: { in: articleIds } }, select: { id: true } });
    const idsValides = new Set(articles.map((a) => a.id));
    if (articleIds.some((id) => !idsValides.has(id))) {
      return res.status(400).json({ error: 'Au moins un articleId est invalide' });
    }

    const mappedLines = lignes.map((l) => ({
      articleId: l.articleId,
      designation: l.designation || '',
      quantitePrev: Number(l.quantitePrev ?? l.quantiteRecue ?? 0),
      quantiteRecue: Number(l.quantiteRecue ?? 0),
      prixUnitaire: Number(l.prixUnitaire ?? 0),
      tva: l.tva !== undefined && l.tva !== null ? Number(l.tva) : null,
      ecart: Number(l.quantiteRecue ?? 0) - Number(l.quantitePrev ?? l.quantiteRecue ?? 0),
      notes: l.notes || null,
    }));

    const reception = await prisma.reception.create({
      data: {
        numero: generateNumero(),
        bonCommandeId,
        fournisseurId: fournisseurId || null,
        notes: notes || null,
        lignes: {
          create: mappedLines,
        },
      },
      include: { lignes: true },
    });

    res.status(201).json(reception);
  } catch (error) {
    console.error('Erreur création réception:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la réception' });
  }
};

exports.listReceptions = async (_req, res) => {
  try {
    const receptions = await prisma.reception.findMany({
      orderBy: { dateReception: 'desc' },
      include: { lignes: true },
    });
    res.json(receptions);
  } catch (error) {
    console.error('Erreur liste réceptions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réceptions' });
  }
};

exports.getReception = async (req, res) => {
  try {
    const reception = await prisma.reception.findUnique({
      where: { id: req.params.id },
      include: { lignes: true },
    });
    if (!reception) return res.status(404).json({ error: 'Réception non trouvée' });
    res.json(reception);
  } catch (error) {
    console.error('Erreur récupération réception:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la réception' });
  }
};

exports.validateReception = async (req, res) => {
  const { id } = req.params;
  try {
    const reception = await prisma.reception.findUnique({
      where: { id },
      include: { lignes: true },
    });
    if (!reception) return res.status(404).json({ error: 'Réception non trouvée' });

    const lignesSansArticle = reception.lignes.filter((l) => !l.articleId);
    if (lignesSansArticle.length > 0) {
      return res.status(400).json({
        error:
          'Validation impossible : toutes les lignes doivent être liées à un article avant validation.',
      });
    }

    // Enregistrer les mouvements d’entrée en stock uniquement pour les lignes liées à un article
    for (const ligne of reception.lignes) {
      await prisma.mouvementStock.create({
        data: {
          articleId: ligne.articleId,
          type: 'ENTREE',
          quantite: ligne.quantiteRecue,
          utilisateurId: req.user?.id?.toString?.() || 'system',
          numeroDocument: reception.numero,
          notes: `Réception ${reception.numero}`,
        },
      });

      await prisma.article.update({
        where: { id: ligne.articleId },
        data: { quantiteStock: { increment: ligne.quantiteRecue } },
      });
    }

    const updated = await prisma.reception.update({
      where: { id },
      data: { status: 'VERIFIEE' },
      include: { lignes: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erreur validation réception:', error);
    res.status(500).json({ error: 'Erreur lors de la validation de la réception' });
  }
};
