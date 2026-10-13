// Gestion des activités et visites terrain.
const { prisma, isMissingTableError, respondMissingTable, getUserId, normalizeTerrainStatus, outcomeFromTerrainStatus, terrainStatusFromActivity } = require('./shared');

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
