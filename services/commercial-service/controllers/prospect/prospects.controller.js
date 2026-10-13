// Gestion des prospects et de leurs conversions.
const { prisma, isMissingTableError, respondMissingTable, toNullableString, normalizeStage, normalizePriority, normalizeSource, getUserId, buildProspectPayload } = require('./shared');

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
