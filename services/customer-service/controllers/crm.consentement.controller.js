'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ======================== CONSENTEMENTS ========================

/**
 * GET /api/crm/consentements/:clientId
 * Récupère tous les consentements d'un client
 */
const getConsentements = async (req, res) => {
  try {
    const { clientId } = req.params;
    const consentements = await prisma.consentementClient.findMany({
      where: { clientId },
      orderBy: [{ canal: 'asc' }, { finalite: 'asc' }],
    });
    res.json({ success: true, data: consentements });
  } catch (error) {
    console.error('[CRM] Erreur getConsentements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des consentements' });
  }
};

/**
 * PUT /api/crm/consentements/:clientId
 * Met à jour un consentement (upsert)
 * Body: { canal, finalite, consenti, sourceConsent, ipAddress }
 */
const upsertConsentement = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { canal, finalite, consenti, sourceConsent, sourceUrl, ipAddress, notes } = req.body;

    if (!canal || !finalite) {
      return res.status(400).json({ error: 'canal et finalite sont requis' });
    }

    const consentement = await prisma.consentementClient.upsert({
      where: { clientId_canal_finalite: { clientId, canal, finalite } },
      update: {
        consenti,
        dateConsent: consenti ? new Date() : undefined,
        dateRevocation: !consenti ? new Date() : null,
        sourceConsent,
        sourceUrl,
        ipAddress,
        notes,
        updatedAt: new Date(),
      },
      create: {
        clientId,
        canal,
        finalite,
        consenti: consenti ?? false,
        dateConsent: consenti ? new Date() : null,
        sourceConsent,
        sourceUrl,
        ipAddress: ipAddress || req.ip,
        notes,
      },
    });

    res.json({ success: true, data: consentement });
  } catch (error) {
    console.error('[CRM] Erreur upsertConsentement:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du consentement' });
  }
};

/**
 * POST /api/crm/consentements/:clientId/bulk
 * Met à jour plusieurs consentements à la fois
 * Body: { consentements: [{ canal, finalite, consenti }] }
 */
const bulkUpdateConsentements = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { consentements } = req.body;

    if (!Array.isArray(consentements) || consentements.length === 0) {
      return res.status(400).json({ error: 'consentements doit être un tableau non vide' });
    }

    const results = await prisma.$transaction(
      consentements.map(({ canal, finalite, consenti }) =>
        prisma.consentementClient.upsert({
          where: { clientId_canal_finalite: { clientId, canal, finalite } },
          update: {
            consenti,
            dateConsent: consenti ? new Date() : undefined,
            dateRevocation: !consenti ? new Date() : null,
            updatedAt: new Date(),
          },
          create: {
            clientId,
            canal,
            finalite,
            consenti: consenti ?? false,
            dateConsent: consenti ? new Date() : null,
            ipAddress: req.ip,
          },
        })
      )
    );

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('[CRM] Erreur bulkUpdateConsentements:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des consentements' });
  }
};

// ======================== SEGMENTS ========================

/**
 * GET /api/crm/segments
 * Liste tous les segments actifs
 */
const getSegments = async (req, res) => {
  try {
    const { isActive, typeSegment } = req.query;
    const segments = await prisma.segmentClient.findMany({
      where: {
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
        ...(typeSegment ? { typeSegment } : {}),
      },
      orderBy: { nom: 'asc' },
      include: { _count: { select: { membres: true } } },
    });
    res.json({ success: true, data: segments, total: segments.length });
  } catch (error) {
    console.error('[CRM] Erreur getSegments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des segments' });
  }
};

/**
 * POST /api/crm/segments
 * Crée un nouveau segment
 */
const createSegment = async (req, res) => {
  try {
    const { nom, description, couleur, criteres, typeSegment, tags } = req.body;
    if (!nom) return res.status(400).json({ error: 'Le nom est requis' });

    const segment = await prisma.segmentClient.create({
      data: {
        nom,
        description,
        couleur: couleur || '#3B82F6',
        criteres: criteres || {},
        typeSegment: typeSegment || 'DYNAMIQUE',
        tags: tags || [],
        createdById: req.user?.id || 'system',
      },
    });
    res.status(201).json({ success: true, data: segment });
  } catch (error) {
    console.error('[CRM] Erreur createSegment:', error);
    res.status(500).json({ error: 'Erreur lors de la création du segment' });
  }
};

/**
 * GET /api/crm/segments/:id/clients
 * Retourne les clients appartenant à un segment (avec évaluation dynamique)
 */
const getSegmentClients = async (req, res) => {
  try {
    const { id } = req.params;
    const segment = await prisma.segmentClient.findUnique({ where: { id } });
    if (!segment) return res.status(404).json({ error: 'Segment non trouvé' });

    let clients = [];

    if (segment.typeSegment === 'STATIQUE') {
      // Segment statique : membres explicitement ajoutés
      const membres = await prisma.segmentClientMembre.findMany({
        where: { segmentId: id, exclure: false },
        include: { client: { include: { typeClient: true } } },
      });
      clients = membres.map(m => m.client);
    } else {
      // Segment dynamique : évaluation des critères
      const criteres = segment.criteres || {};
      const where = buildClientWhere(criteres);
      clients = await prisma.client.findMany({
        where,
        include: { typeClient: true },
        take: 500,
      });

      // Exclure les membres explicitement exclus
      const exclusions = await prisma.segmentClientMembre.findMany({
        where: { segmentId: id, exclure: true },
        select: { clientId: true },
      });
      const exclusionIds = new Set(exclusions.map(e => e.clientId));
      clients = clients.filter(c => !exclusionIds.has(c.id));
    }

    // Mettre à jour le compteur
    await prisma.segmentClient.update({
      where: { id },
      data: { compte: clients.length, dernierCalcul: new Date() },
    });

    res.json({ success: true, data: clients, total: clients.length });
  } catch (error) {
    console.error('[CRM] Erreur getSegmentClients:', error);
    res.status(500).json({ error: 'Erreur lors de l\'évaluation du segment' });
  }
};

/**
 * Construit un filtre Prisma à partir des critères JSON d'un segment
 */
function buildClientWhere(criteres) {
  const where = {};
  if (criteres.status) where.status = Array.isArray(criteres.status) ? { in: criteres.status } : criteres.status;
  if (criteres.classificationMetier) where.classificationMetier = { in: Array.isArray(criteres.classificationMetier) ? criteres.classificationMetier : [criteres.classificationMetier] };
  if (criteres.zoneGeographique) where.zoneGeographique = { contains: criteres.zoneGeographique, mode: 'insensitive' };
  if (criteres.scoreFideliteMin) where.scoreFidelite = { ...(where.scoreFidelite || {}), gte: criteres.scoreFideliteMin };
  if (criteres.scoreFideliteMax) where.scoreFidelite = { ...(where.scoreFidelite || {}), lte: criteres.scoreFideliteMax };
  if (criteres.createdAfter) where.createdAt = { ...(where.createdAt || {}), gte: new Date(criteres.createdAfter) };
  if (criteres.createdBefore) where.createdAt = { ...(where.createdAt || {}), lte: new Date(criteres.createdBefore) };
  if (criteres.doNotContact !== undefined) where.doNotContact = criteres.doNotContact;
  return where;
}

/**
 * PATCH /api/crm/segments/:id
 */
const updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, couleur, criteres, isActive, tags } = req.body;
    const segment = await prisma.segmentClient.update({
      where: { id },
      data: { nom, description, couleur, criteres, isActive, tags, updatedAt: new Date() },
    });
    res.json({ success: true, data: segment });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Segment non trouvé' });
    res.status(500).json({ error: 'Erreur lors de la mise à jour du segment' });
  }
};

/**
 * DELETE /api/crm/segments/:id
 */
const deleteSegment = async (req, res) => {
  try {
    await prisma.segmentClient.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Segment supprimé' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Segment non trouvé' });
    res.status(500).json({ error: 'Erreur lors de la suppression du segment' });
  }
};

module.exports = {
  getConsentements,
  upsertConsentement,
  bulkUpdateConsentements,
  getSegments,
  createSegment,
  getSegmentClients,
  updateSegment,
  deleteSegment,
};
