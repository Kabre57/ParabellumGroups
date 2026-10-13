// Règles de normalisation et outils communs aux parcours de prospection.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'P2021' ||
    message.includes('prospects') ||
    (message.includes('relation') && message.includes('prospect'))
  );
};

const respondMissingTable = (res) =>
  res.status(503).json({
    success: false,
    error: 'Base prospects non initialisee',
  });

const STAGE_MAP = {
  preparation: 'PREPARATION',
  recherche: 'RECHERCHE',
  research: 'RECHERCHE',
  contact: 'CONTACT_INITIAL',
  contact_initial: 'CONTACT_INITIAL',
  discovery: 'DECOUVERTE',
  decouverte: 'DECOUVERTE',
  proposal: 'PROPOSITION',
  proposition: 'PROPOSITION',
  negotiation: 'NEGOCIATION',
  negociation: 'NEGOCIATION',
  won: 'GAGNE',
  gagne: 'GAGNE',
  lost: 'PERDU',
  perdu: 'PERDU',
  on_hold: 'MISE_EN_ATTENTE',
  mise_en_attente: 'MISE_EN_ATTENTE',
};

const PRIORITY_MAP = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
};

const normalizeText = (value) => {
  if (value == null) return '';
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const toNullableString = (value) => {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
};

const toNullableNumber = (value) => {
  if (value === '' || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toNullableDate = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeStage = (value) => {
  if (!value) return undefined;
  const normalized = normalizeText(value).replace(/\s+/g, '_');
  return STAGE_MAP[normalized] || String(value).toUpperCase();
};

const normalizePriority = (value) => {
  if (!value) return undefined;
  return PRIORITY_MAP[normalizeText(value)] || String(value).toUpperCase();
};

const normalizeSource = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  if (normalized.includes('linkedin') || normalized.includes('reseau') || normalized.includes('social')) return 'RESEAUX_SOCIAUX';
  if (normalized.includes('salon')) return 'SALON';
  if (
    normalized.includes('terrain') ||
    normalized.includes('demarch') ||
    normalized.includes('porte a porte')
  ) {
    return 'CAMPAGNE';
  }
  if (normalized.includes('recommand') || normalized.includes('reference') || normalized.includes('referral')) return 'RECOMMANDATION';
  if (normalized.includes('partenaire') || normalized.includes('partner')) return 'PARTENAIRE';
  if (normalized.includes('site') || normalized.includes('web')) return 'SITE_WEB';
  if (normalized.includes('email') || normalized.includes('mail')) return 'EMAIL';
  if (normalized.includes('entrant')) return 'APPEL_ENTRANT';
  if (normalized.includes('appel') || normalized.includes('call')) return 'APPEL_SORTANT';
  if (normalized.includes('campagne') || normalized.includes('campaign')) return 'CAMPAGNE';
  return 'AUTRE';
};

const getUserId = (req) => String(req.user.id);

const normalizeTerrainStatus = (value) => String(value || '').toUpperCase();

const outcomeFromTerrainStatus = (status) => {
  const normalized = normalizeTerrainStatus(status);
  if (normalized === 'TERMINEE') return 'TERMINE';
  if (normalized === 'ANNULEE') return 'ANNULE';
  if (normalized === 'EN_COURS') return 'A_RELANCER';
  return 'A_SUIVRE';
};

const terrainStatusFromActivity = (activity) => {
  if (activity.isCompleted) {
    return activity.outcome === 'ANNULE' ? 'ANNULEE' : 'TERMINEE';
  }
  if (activity.outcome === 'ANNULE') return 'ANNULEE';
  if (activity.outcome === 'TERMINE') return 'TERMINEE';
  if (activity.outcome === 'A_RELANCER') return 'EN_COURS';
  if (activity.scheduledAt && new Date(activity.scheduledAt) <= new Date()) {
    return 'EN_COURS';
  }
  return 'PLANIFIEE';
};

const buildProspectPayload = (body, userId, oldProspect = null) => {
  const normalizedUserId = userId ? String(userId) : undefined;
  const nextAssignedToId = toNullableString(body.assignedToId);
  const oldAssignedToId = oldProspect?.assignedToId || null;
  const assignedChanged = nextAssignedToId && nextAssignedToId !== oldAssignedToId;

  return {
    companyName: toNullableString(body.companyName || body.raisonSociale || body.nomEntreprise),
    contactName: toNullableString(body.contactName || body.nomContact || body.contact),
    civilite: toNullableString(body.civilite),
    position: toNullableString(body.position),
    email: toNullableString(body.email),
    emailSecondaire: toNullableString(body.emailSecondaire),
    phone: toNullableString(body.phone || body.telephone),
    mobile: toNullableString(body.mobile),
    fax: toNullableString(body.fax),
    linkedin: toNullableString(body.linkedin),
    website: toNullableString(body.website),
    idu: toNullableString(body.idu || body.siret),
    ncc: toNullableString(body.ncc || body.tvaIntra),
    rccm: toNullableString(body.rccm),
    secteurActivite: toNullableString(body.sector || body.secteurActivite),
    codeActivite: toNullableString(body.codeActivite || body.codeNAF),
    employees: toNullableNumber(body.employees),
    revenue: toNullableNumber(body.revenue),
    address: toNullableString(body.address || body.ligne1 || body.quartier),
    address2: toNullableString(body.address2 || body.ligne2),
    address3: toNullableString(body.address3 || body.ligne3 || body.repere),
    city: toNullableString(body.city || body.ville || body.commune),
    postalCode: toNullableString(body.postalCode || body.bp || body.boitePostale),
    region: toNullableString(body.region || body.district),
    country: toNullableString(body.country),
    gpsCoordinates: toNullableString(body.gpsCoordinates || body.coordonneesGps),
    accessNotes: toNullableString(body.accessNotes || body.informationsAcces),
    stage: normalizeStage(body.stage),
    priorite: normalizePriority(body.priority || body.priorite),
    source: normalizeSource(body.source),
    assignedToId: nextAssignedToId,
    assignedAt: assignedChanged ? new Date() : undefined,
    assignedBy: assignedChanged ? normalizedUserId : undefined,
    potentialValue: toNullableNumber(body.potentialValue),
    closingProbability: toNullableNumber(body.closingProbability),
    estimatedCloseDate: toNullableDate(body.estimatedCloseDate),
    notes: toNullableString(body.notes),
    tags: Array.isArray(body.tags)
      ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : undefined,
  };
};

/**
 * Contrôleur pour la gestion complète de la prospection
 */

module.exports = { prisma, isMissingTableError, respondMissingTable, STAGE_MAP, PRIORITY_MAP, normalizeText, toNullableString, toNullableNumber, toNullableDate, normalizeStage, normalizePriority, normalizeSource, getUserId, normalizeTerrainStatus, outcomeFromTerrainStatus, terrainStatusFromActivity, buildProspectPayload };
