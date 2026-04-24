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
exports.getAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      stage, 
      assignedToId, 
      priority, 
      search,
      isConverted,
      sector,
      source,
      country,
      scoreMin,
      scoreMax
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    
    if (stage) {
      where.stage = normalizeStage(stage);
    }
    
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }
    
    if (priority) {
      where.priorite = normalizePriority(priority);
    }
    
    if (isConverted !== undefined) {
      where.isConverted = isConverted === 'true';
    }
    
    if (sector) {
      where.secteurActivite = { contains: sector, mode: 'insensitive' };
    }
    
    if (source) {
      where.source = normalizeSource(source);
    }
    
    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }
    
    if (scoreMin || scoreMax) {
      where.score = {};
      if (scoreMin) where.score.gte = parseInt(scoreMin);
      if (scoreMax) where.score.lte = parseInt(scoreMax);
    }
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { idu: { contains: search, mode: 'insensitive' } },
        { ncc: { contains: search, mode: 'insensitive' } },
        { rccm: { contains: search, mode: 'insensitive' } },
        { codeActivite: { contains: search, mode: 'insensitive' } },
        { secteurActivite: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          activities: {
            take: 5,
            orderBy: { scheduledAt: 'desc' },
            where: {
              isCompleted: true
            }
          },
          documentsRel: {
            take: 3,
            orderBy: { uploadedAt: 'desc' }
          },
          notesRel: {
            take: 3,
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.prospect.count({ where })
    ]);
    
    res.json({
      success: true,
      data: prospects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des prospects:', error);
    if (isMissingTableError(error)) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 },
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des prospects',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            documents: true
          }
        },
        documentsRel: {
          orderBy: { uploadedAt: 'desc' }
        },
        notesRel: {
          orderBy: { createdAt: 'desc' }
        },
        competitors: {
          orderBy: { createdAt: 'desc' }
        },
        history: {
          orderBy: { changedAt: 'desc' },
          take: 20
        }
      }
    });
    
    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: prospect
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du prospect:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.create = async (req, res) => {
  try {
    if (
      !toNullableString(req.body.companyName || req.body.raisonSociale || req.body.nomEntreprise) ||
      !toNullableString(req.body.contactName || req.body.nomContact || req.body.contact) ||
      !toNullableString(req.body.source)
    ) {
      return res.status(400).json({
        success: false,
        error: "L'entreprise, le contact principal et la source sont obligatoires",
      });
    }

    // Générer une référence unique
    const reference = `PROS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const userId = getUserId(req);
    const mappedFields = buildProspectPayload(req.body, userId);

    const prospectData = {
      ...mappedFields,
      reference,
      assignedToId: mappedFields.assignedToId || userId,
      assignedAt: mappedFields.assignedToId ? new Date() : null,
      assignedBy: mappedFields.assignedToId ? userId : null,
      createdBy: userId,
      documents: [],
    };
    
    const prospect = await prisma.prospect.create({
      data: prospectData,
      include: {
        activities: true,
        documentsRel: true,
        notesRel: true
      }
    });
    
    // Créer une entrée d'historique
    await prisma.prospectHistory.create({
      data: {
        prospectId: prospect.id,
        fieldChanged: 'CREATION',
        changeType: 'CREATE',
        oldValue: null,
        newValue: JSON.stringify(prospect),
        changedById: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    
    res.status(201).json({
      success: true,
      data: prospect,
      message: 'Prospect créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du prospect:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    // Récupérer les anciennes valeurs pour l'historique
    const oldProspect = await prisma.prospect.findUnique({ where: { id } });

    if (!oldProspect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect non trouvé'
      });
    }

    const updateData = {
      ...buildProspectPayload(req.body, userId, oldProspect),
      updatedBy: userId,
      version: oldProspect.version + 1,
    };
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: updateData,
      include: {
        activities: {
          orderBy: { scheduledAt: 'desc' },
          take: 10
        },
        documentsRel: {
          take: 5,
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });
    
    // Enregistrer les changements dans l'historique
    const changes = [];
    for (const [key, value] of Object.entries(updateData)) {
      const oldValue = oldProspect[key];
      const newValue = value;
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue) && key !== 'updatedAt' && key !== 'version') {
        changes.push({
          prospectId: id,
          fieldChanged: key,
          changeType: 'UPDATE',
          oldValue: oldValue ? JSON.stringify(oldValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          changedById: userId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    }
    
    if (changes.length > 0) {
      await prisma.prospectHistory.createMany({
        data: changes
      });
    }
    
    res.json({
      success: true,
      data: prospect,
      message: 'Prospect mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du prospect:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.prospect.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Prospect supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du prospect:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.moveStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;
    const userId = getUserId(req);
    
    // Récupérer l'ancien prospect
    const oldProspect = await prisma.prospect.findUnique({ where: { id } });
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: { 
        stage: stage.toUpperCase(),
        updatedAt: new Date(),
        updatedBy: userId,
        version: oldProspect.version + 1
      },
      include: {
        activities: true,
        notesRel: true
      }
    });
    
    // Créer une note si fournie
    if (notes) {
      await prisma.noteProspect.create({
        data: {
          prospectId: id,
          title: `Changement d'étape: ${oldProspect.stage} → ${stage}`,
          content: notes,
          type: 'STATUS_CHANGE',
          createdById: userId
        }
      });
    }
    
    // Enregistrer dans l'historique
    await prisma.prospectHistory.create({
      data: {
        prospectId: id,
        fieldChanged: 'stage',
        changeType: 'STATUS_CHANGE',
        oldValue: oldProspect.stage,
        newValue: stage,
        changedById: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    
    res.json({
      success: true,
      data: prospect,
      message: 'Prospect déplacé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du déplacement du prospect:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déplacement du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.convert = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, conversionReason } = req.body;
    const userId = getUserId(req);
    
    const prospect = await prisma.prospect.update({
      where: { id },
      data: {
        isConverted: true,
        convertedAt: new Date(),
        convertedBy: userId,
        customerId,
        conversionReason,
        stage: 'GAGNE',
        updatedBy: userId
      }
    });
    
    await prisma.prospectActivity.create({
      data: {
        prospectId: id,
        type: 'REUNION',
        subject: 'Conversion en client',
        description: `Prospect converti en client${conversionReason ? `: ${conversionReason}` : ''}`,
        outcome: 'POSITIF',
        completedAt: new Date(),
        duration: 0,
        createdById: userId,
        isCompleted: true,
        tags: ['conversion']
      }
    });
    
    res.json({
      success: true,
      data: prospect,
      message: 'Prospect converti en client avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la conversion du prospect:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la conversion du prospect',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, completed, startDate, endDate } = req.query;
    
    const where = { prospectId: id };
    
    if (type) {
      where.type = type.toUpperCase();
    }
    
    if (completed !== undefined) {
      where.isCompleted = completed === 'true';
    }
    
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }
    
    const activities = await prisma.prospectActivity.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        documents: true
      }
    });
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    if (isMissingTableError(error)) {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des activités',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const activityData = {
      prospectId: id,
      ...req.body,
      createdById: userId
    };
    
    // Si une date de planification est fournie, marquer comme non complété
    if (activityData.scheduledAt) {
      activityData.isCompleted = false;
    }
    
    const activity = await prisma.prospectActivity.create({
      data: activityData,
      include: {
        documents: true
      }
    });
    
    // Mettre à jour la date de dernière activité du prospect
    await prisma.prospect.update({
      where: { id },
      data: {
        lastActivityDate: new Date(),
        nextActivityDate: activity.scheduledAt || null
      }
    });
    
    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activité ajoutée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'activité:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de l\'activité',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const { id, activityId } = req.params;
    
    const activity = await prisma.prospectActivity.update({
      where: { id: activityId },
      data: {
        ...req.body,
        updatedAt: new Date()
      }
    });
    
    // Si l'activité est marquée comme complétée
    if (req.body.isCompleted && !req.body.completedAt) {
      await prisma.prospectActivity.update({
        where: { id: activityId },
        data: {
          completedAt: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      data: activity,
      message: 'Activité mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'activité:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'activité',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getTerrainVisits = async (req, res) => {
  try {
    const { status, assignee, startDate, endDate, due } = req.query;
    const where = { type: 'VISITE' };

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    if (assignee) {
      where.participants = { has: String(assignee) };
    }

    if (status) {
      const normalized = normalizeTerrainStatus(status);
      if (normalized === 'TERMINEE') {
        where.isCompleted = true;
      } else if (normalized === 'ANNULEE') {
        where.outcome = 'ANNULE';
      }
    }

    if (due) {
      where.scheduledAt = where.scheduledAt || {};
      where.scheduledAt.lte = new Date();
      where.isCompleted = false;
      where.NOT = { outcome: 'ANNULE' };
    }

    const visits = await prisma.prospectActivity.findMany({
      where,
      include: {
        prospect: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    const data = visits.map((activity) => ({
      id: activity.id,
      prospect: activity.prospect,
      scheduledAt: activity.scheduledAt,
      assignee: activity.participants?.[0] || null,
      status: terrainStatusFromActivity(activity),
      note: activity.notes || '',
      outcome: activity.outcome,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur lors de la récupération des visites terrain:', error);
    if (isMissingTableError(error)) {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des visites terrain',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.createTerrainVisit = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      prospectId,
      scheduledAt,
      assignee,
      status,
      note,
      subject,
      location,
    } = req.body;

    if (!prospectId) {
      return res.status(400).json({ success: false, error: 'Prospect requis' });
    }

    const activity = await prisma.prospectActivity.create({
      data: {
        prospectId,
        type: 'VISITE',
        subject: subject || 'Visite terrain',
        description: location || 'Passage terrain',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        participants: assignee ? [String(assignee)] : [],
        notes: note || null,
        outcome: outcomeFromTerrainStatus(status),
        isCompleted: normalizeTerrainStatus(status) === 'TERMINEE' || normalizeTerrainStatus(status) === 'ANNULEE',
        createdById: userId,
      },
      include: { prospect: true },
    });

    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        lastActivityDate: new Date(),
        nextActivityDate: activity.scheduledAt || null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: activity.id,
        prospect: activity.prospect,
        scheduledAt: activity.scheduledAt,
        assignee: activity.participants?.[0] || null,
        status: terrainStatusFromActivity(activity),
        note: activity.notes || '',
        outcome: activity.outcome,
      },
      message: 'Visite terrain créée',
    });
  } catch (error) {
    console.error('Erreur lors de la création de la visite terrain:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la visite terrain',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.updateTerrainVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { scheduledAt, assignee, status, note, subject, location } = req.body;

    const updated = await prisma.prospectActivity.update({
      where: { id: visitId },
      data: {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        participants: assignee ? [String(assignee)] : undefined,
        notes: note !== undefined ? note : undefined,
        subject: subject !== undefined ? subject : undefined,
        description: location !== undefined ? location : undefined,
        outcome: status ? outcomeFromTerrainStatus(status) : undefined,
        isCompleted:
          status && ['TERMINEE', 'ANNULEE'].includes(normalizeTerrainStatus(status))
            ? true
            : undefined,
        completedAt:
          status && ['TERMINEE', 'ANNULEE'].includes(normalizeTerrainStatus(status))
            ? new Date()
            : undefined,
        updatedAt: new Date(),
      },
      include: { prospect: true },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        prospect: updated.prospect,
        scheduledAt: updated.scheduledAt,
        assignee: updated.participants?.[0] || null,
        status: terrainStatusFromActivity(updated),
        note: updated.notes || '',
        outcome: updated.outcome,
      },
      message: 'Visite terrain mise à jour',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la visite terrain:', error);
    if (isMissingTableError(error)) {
      return respondMissingTable(res);
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la visite terrain',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { period = 'MONTHLY', userId, teamId, startDate, endDate } = req.query;
    
    // Filtrer par date si spécifié
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    
    const [
      totalProspects,
      byStage,
      byPriority,
      convertedCount,
      recentActivities,
      bySource,
      topSectors,
      revenueStats
    ] = await Promise.all([
      prisma.prospect.count(),
      prisma.prospect.groupBy({
        by: ['stage'],
        _count: { stage: true },
        where: dateFilter
      }),
      prisma.prospect.groupBy({
        by: ['priorite'],
        _count: { priorite: true },
        where: dateFilter
      }),
      prisma.prospect.count({ 
        where: { 
          isConverted: true,
          ...dateFilter
        } 
      }),
      prisma.prospectActivity.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          },
          isCompleted: true
        }
      }),
      prisma.prospect.groupBy({
        by: ['source'],
        _count: { source: true },
        where: dateFilter
      }),
      prisma.prospect.groupBy({
        by: ['secteurActivite'],
        _count: { secteurActivite: true },
        where: {
          secteurActivite: { not: null },
          ...dateFilter
        },
        orderBy: {
          _count: {
            secteurActivite: 'desc'
          }
        },
        take: 10
      }),
      prisma.prospect.aggregate({
        where: dateFilter,
        _sum: {
          potentialValue: true,
          revenue: true
        },
        _avg: {
          score: true,
          closingProbability: true
        }
      })
    ]);
    
    const byStageMap = byStage.reduce((acc, item) => {
      acc[item.stage] = item._count.stage;
      return acc;
    }, {});
    
    const byPriorityMap = byPriority.reduce((acc, item) => {
      acc[item.priorite] = item._count.priorite;
      return acc;
    }, {});
    
    const bySourceMap = bySource.reduce((acc, item) => {
      if (item.source) {
        acc[item.source] = item._count.source;
      }
      return acc;
    }, {});
    
    const bySectorMap = topSectors.reduce((acc, item) => {
      if (item.secteurActivite) {
        acc[item.secteurActivite] = item._count.secteurActivite;
      }
      return acc;
    }, {});
    
    const conversionRate = totalProspects > 0 
      ? (convertedCount / totalProspects) * 100 
      : 0;
    
    // Récupérer les statistiques planifiées
    const periodStats = await prisma.prospectionStats.findMany({
      where: {
        period,
        userId: userId || undefined,
        teamId: teamId || undefined,
        date: dateFilter
      },
      orderBy: { date: 'desc' },
      take: 12
    });
    
    res.json({
      success: true,
      data: {
        totalProspects,
        convertedProspects: convertedCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        recentActivities,
        totalPotentialValue: revenueStats._sum.potentialValue || 0,
        totalRevenue: revenueStats._sum.revenue || 0,
        averageScore: revenueStats._avg.score || 0,
        averageClosingProbability: revenueStats._avg.closingProbability || 0,
        byStage: byStageMap,
        byPriority: byPriorityMap,
        bySource: bySourceMap,
        bySector: bySectorMap,
        periodStats: periodStats.reverse(),
        timeframe: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    if (isMissingTableError(error)) {
      return res.json({
        success: true,
        data: {
          totalProspects: 0,
          convertedProspects: 0,
          conversionRate: 0,
          recentActivities: 0,
          byStage: {},
          byPriority: {},
        },
      });
    }
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { status, type } = req.query;
    
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type.toUpperCase();
    
    const campaigns = await prisma.prospectionCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { prospects: true }
        }
      }
    });
    
    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des campagnes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const userId = getUserId(req);
    const campaignData = {
      ...req.body,
      createdById: userId
    };
    
    const campaign = await prisma.prospectionCampaign.create({
      data: campaignData
    });
    
    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campagne créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la campagne:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la campagne',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getSequences = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const sequences = await prisma.prospectionSequence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { 
            steps: true,
            assignedProspects: true 
          }
        },
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });
    
    res.json({
      success: true,
      data: sequences
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des séquences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des séquences',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.assignToSequence = async (req, res) => {
  try {
    const { id } = req.params;
    const { sequenceId } = req.body;
    const userId = getUserId(req);
    
    const assignment = await prisma.sequenceAssignment.create({
      data: {
        sequenceId,
        prospectId: id,
        assignedById: userId,
        status: 'ACTIVE',
        startedAt: new Date()
      }
    });
    
    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Prospect assigné à la séquence avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'assignation à la séquence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'assignation à la séquence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    
    const where = { prospectId: id };
    if (type) {
      where.type = type.toUpperCase();
    }
    
    const documents = await prisma.documentProspect.findMany({
      where,
      orderBy: { uploadedAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const documentData = {
      prospectId: id,
      ...req.body,
      uploadedById: userId,
      uploadedAt: new Date()
    };
    
    const document = await prisma.documentProspect.create({
      data: documentData
    });
    
    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploadé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCompetitors = async (req, res) => {
  try {
    const { id } = req.params;
    
    const competitors = await prisma.competitorProspect.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: competitors
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des concurrents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des concurrents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addCompetitor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const competitor = await prisma.competitorProspect.create({
      data: {
        prospectId: id,
        ...req.body
      }
    });
    
    res.status(201).json({
      success: true,
      data: competitor,
      message: 'Concurrent ajouté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du concurrent:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du concurrent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const history = await prisma.prospectHistory.findMany({
      where: { prospectId: id },
      orderBy: { changedAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getTargets = async (req, res) => {
  try {
    const { period = 'MONTHLY', userId, teamId, year } = req.query;
    
    const where = {
      period: period.toUpperCase(),
      isActive: true
    };
    
    if (userId) where.userId = userId;
    if (teamId) where.teamId = teamId;
    if (year) where.year = parseInt(year);
    
    const targets = await prisma.salesTarget.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    
    res.json({
      success: true,
      data: targets
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des objectifs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des objectifs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Calculer le taux de complétion
    if (updateData.actualRevenue !== undefined && updateData.targetRevenue) {
      updateData.completionRate = (updateData.actualRevenue / updateData.targetRevenue) * 100;
    }
    
    const target = await prisma.salesTarget.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      data: target,
      message: 'Objectif mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objectif:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'objectif',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    
    const where = { prospectId: id };
    if (type) {
      where.type = type.toUpperCase();
    }
    
    const notes = await prisma.noteProspect.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const note = await prisma.noteProspect.create({
      data: {
        prospectId: id,
        ...req.body,
        createdById: userId
      }
    });
    
    res.status(201).json({
      success: true,
      data: note,
      message: 'Note ajoutée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de la note',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    
    const where = {};
    if (type) where.type = type.toUpperCase();
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const userId = getUserId(req);
    const template = await prisma.emailTemplate.create({
      data: {
        ...req.body,
        createdById: userId
      }
    });
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du template:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
