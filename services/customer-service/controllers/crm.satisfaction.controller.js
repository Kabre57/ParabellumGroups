'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/crm/sondages
 * Liste les sondages
 */
const getSondages = async (req, res) => {
  try {
    const { statut, typeSondage } = req.query;
    const sondages = await prisma.sondageSatisfaction.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(typeSondage ? { typeSondage } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        segment: { select: { id: true, nom: true } },
        _count: { select: { reponses: true } },
      },
    });
    res.json({ success: true, data: sondages, total: sondages.length });
  } catch (error) {
    console.error('[CRM] Erreur getSondages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sondages' });
  }
};

/**
 * POST /api/crm/sondages
 * Crée un sondage de satisfaction
 */
const createSondage = async (req, res) => {
  try {
    const {
      titre, description, typeSondage, declencheur,
      delaiEnvoiJours, questions, segmentId, dateDebut, dateFin,
    } = req.body;

    if (!titre) return res.status(400).json({ error: 'Le titre est requis' });

    const sondage = await prisma.sondageSatisfaction.create({
      data: {
        titre,
        description,
        typeSondage: typeSondage || 'NPS',
        statut: 'BROUILLON',
        declencheur: declencheur || 'MANUEL',
        delaiEnvoiJours: delaiEnvoiJours || 1,
        questions: questions || buildDefaultQuestions(typeSondage || 'NPS'),
        segmentId,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null,
        createdById: req.user?.id || 'system',
      },
    });
    res.status(201).json({ success: true, data: sondage });
  } catch (error) {
    console.error('[CRM] Erreur createSondage:', error);
    res.status(500).json({ error: 'Erreur lors de la création du sondage' });
  }
};

/**
 * GET /api/crm/sondages/stats
 * Statistiques NPS/CSAT globales
 */
const getSondageStats = async (req, res) => {
  try {
    const { sondageId } = req.query;

    const where = sondageId ? { sondageId } : {};

    const reponses = await prisma.reponseSondage.findMany({
      where: { ...where, reponseLe: { not: null } },
      select: { scoreNPS: true, categorieNPS: true, scoreGlobal: true, commentaire: true },
    });

    const withScore = reponses.filter(r => r.scoreNPS !== null && r.scoreNPS !== undefined);
    const promoteurs = withScore.filter(r => r.categorieNPS === 'PROMOTEUR').length;
    const passifs = withScore.filter(r => r.categorieNPS === 'PASSIF').length;
    const detracteurs = withScore.filter(r => r.categorieNPS === 'DETRACTEUR').length;
    const total = withScore.length;

    const scoreNPS = total > 0
      ? Math.round(((promoteurs - detracteurs) / total) * 100)
      : null;

    const allGlobalScores = reponses.filter(r => r.scoreGlobal !== null).map(r => r.scoreGlobal);
    const scoreMoyen = allGlobalScores.length > 0
      ? allGlobalScores.reduce((a, b) => a + b, 0) / allGlobalScores.length
      : null;

    res.json({
      success: true,
      data: {
        scoreNPS,
        scoreMoyen: scoreMoyen ? Number(scoreMoyen.toFixed(1)) : null,
        totalReponses: reponses.length,
        totalAvecScore: total,
        promoteurs,
        passifs,
        detracteurs,
        tauxPromotion: total > 0 ? Number(((promoteurs / total) * 100).toFixed(1)) : 0,
        commentairesRecents: reponses
          .filter(r => r.commentaire)
          .slice(-5)
          .map(r => r.commentaire),
      },
    });
  } catch (error) {
    console.error('[CRM] Erreur getSondageStats:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
};

/**
 * POST /api/crm/sondages/repondre
 * Enregistre une réponse à un sondage (accessible publiquement via token)
 */
const enregistrerReponse = async (req, res) => {
  try {
    const { tokenAcces, reponses, commentaire } = req.body;

    const existante = await prisma.reponseSondage.findUnique({
      where: { tokenAcces },
      include: { sondage: true },
    });

    if (!existante) return res.status(404).json({ error: 'Token invalide ou expiré' });
    if (existante.reponseLe) return res.status(409).json({ error: 'Ce sondage a déjà été complété' });

    // Calcul NPS si applicable
    const scoreNPS = reponses?.nps !== undefined ? Number(reponses.nps) : null;
    let categorieNPS = null;
    if (scoreNPS !== null) {
      if (scoreNPS >= 9) categorieNPS = 'PROMOTEUR';
      else if (scoreNPS >= 7) categorieNPS = 'PASSIF';
      else categorieNPS = 'DETRACTEUR';
    }

    // Score global (moyenne des réponses numériques)
    const valeurNum = Object.values(reponses || {}).filter(v => typeof v === 'number');
    const scoreGlobal = valeurNum.length > 0
      ? valeurNum.reduce((a, b) => a + b, 0) / valeurNum.length
      : null;

    const [reponse] = await prisma.$transaction([
      prisma.reponseSondage.update({
        where: { tokenAcces },
        data: {
          reponses,
          scoreGlobal,
          scoreNPS,
          categorieNPS,
          commentaire,
          reponseLe: new Date(),
        },
      }),
      prisma.sondageSatisfaction.update({
        where: { id: existante.sondageId },
        data: { nombreReponses: { increment: 1 } },
      }),
    ]);

    res.json({ success: true, data: reponse, message: 'Merci pour votre réponse !' });
  } catch (error) {
    console.error('[CRM] Erreur enregistrerReponse:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la réponse' });
  }
};

/**
 * POST /api/crm/sondages/:id/envoyer
 * Envoie un sondage à un segment ou à une liste de clients
 */
const envoyerSondage = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientIds } = req.body;

    const sondage = await prisma.sondageSatisfaction.findUnique({ where: { id } });
    if (!sondage) return res.status(404).json({ error: 'Sondage non trouvé' });

    const crypto = require('crypto');
    const envois = [];

    for (const clientId of (clientIds || [])) {
      const token = crypto.randomBytes(32).toString('hex');
      const envoi = await prisma.reponseSondage.create({
        data: {
          sondageId: id,
          clientId,
          tokenAcces: token,
          reponses: {},
          envoiLe: new Date(),
        },
      });
      envois.push({ ...envoi, lienSondage: `/sondage/${token}` });
    }

    await prisma.sondageSatisfaction.update({
      where: { id },
      data: {
        statut: 'ACTIF',
        nombreEnvois: { increment: envois.length },
      },
    });

    res.json({
      success: true,
      data: envois,
      message: `${envois.length} sondage(s) envoyé(s)`,
      // NOTE: Intégration API email/SMS à connecter ici
      integration: {
        note: 'Connectez votre fournisseur (Mailgun, Twilio, etc.) via la config CRM_MAILER_URL',
        tokens: envois.map(e => ({ clientId: e.clientId, token: e.tokenAcces })),
      },
    });
  } catch (error) {
    console.error('[CRM] Erreur envoyerSondage:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du sondage' });
  }
};

/**
 * Construit les questions par défaut selon le type de sondage
 */
function buildDefaultQuestions(type) {
  if (type === 'NPS') {
    return [
      {
        id: 'nps',
        type: 'SCALE',
        texte: 'Sur une échelle de 0 à 10, quelle est la probabilité que vous recommandiez nos services à un ami ou un collègue ?',
        min: 0,
        max: 10,
        obligatoire: true,
      },
      {
        id: 'raison',
        type: 'TEXT',
        texte: 'Qu\'est-ce qui justifie principalement votre note ?',
        obligatoire: false,
      },
    ];
  }
  if (type === 'CSAT') {
    return [
      {
        id: 'satisfaction',
        type: 'SCALE',
        texte: 'Dans l\'ensemble, êtes-vous satisfait(e) de notre service ?',
        min: 1,
        max: 5,
        labels: ['Très insatisfait', 'Insatisfait', 'Neutre', 'Satisfait', 'Très satisfait'],
        obligatoire: true,
      },
      {
        id: 'amelioration',
        type: 'TEXT',
        texte: 'Que pourrions-nous améliorer ?',
        obligatoire: false,
      },
    ];
  }
  return [{ id: 'q1', type: 'TEXT', texte: 'Votre commentaire', obligatoire: true }];
}

module.exports = {
  getSondages,
  createSondage,
  getSondageStats,
  enregistrerReponse,
  envoyerSondage,
};
