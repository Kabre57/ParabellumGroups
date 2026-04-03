const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const mapPresenceToAbsence = (payload) => ({
  matricule: payload.employeId ?? payload.matricule,
  dateAbsence: payload.date ? new Date(payload.date) : undefined,
  typeAbsence: payload.type ?? payload.typeAbsence ?? 'ABSENCE',
  nombreJours: payload.nombreJours ?? 1,
  justification: payload.notes ?? payload.justification,
  retenueSalaire: payload.retenueSalaire ?? 0,
});

const mapAbsenceToPresence = (absence) => ({
  id: absence.id,
  employeId: absence.matricule,
  date: absence.dateAbsence,
  type: absence.typeAbsence,
  notes: absence.justification,
  createdAt: absence.createdAt,
  updatedAt: absence.updatedAt,
  employe: absence.employe,
});

exports.listByEmployee = async (req, res) => {
  try {
    const { employeId } = req.params;
    const { startDate, endDate, type } = req.query;
    const where = { matricule: employeId };

    if (startDate || endDate) {
      where.dateAbsence = {};
      if (startDate) where.dateAbsence.gte = new Date(startDate);
      if (endDate) where.dateAbsence.lte = new Date(endDate);
    }
    if (type) where.typeAbsence = type;

    const absences = await prisma.absence.findMany({
      where,
      include: { employe: true },
      orderBy: { dateAbsence: 'desc' },
    });
    res.json({ success: true, data: absences.map(mapAbsenceToPresence) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.stats = async (req, res) => {
  try {
    const { employeId, startDate, endDate } = req.query;
    const where = {};
    if (employeId) where.matricule = employeId;
    if (startDate || endDate) {
      where.dateAbsence = {};
      if (startDate) where.dateAbsence.gte = new Date(startDate);
      if (endDate) where.dateAbsence.lte = new Date(endDate);
    }

    const absences = await prisma.absence.findMany({ where });
    const totalJours = absences.reduce((sum, row) => sum + Number(row.nombreJours || 0), 0);
    const parType = absences.reduce((acc, row) => {
      const key = row.typeAbsence || 'ABSENCE';
      acc[key] = (acc[key] || 0) + Number(row.nombreJours || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalJours,
        parType,
        heuresTotal: 0,
        moyenneHeuresParJour: 0,
        tauxPresence: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const { employeId, startDate, endDate } = req.query;
    const where = {};
    if (employeId) where.matricule = employeId;
    if (startDate || endDate) {
      where.dateAbsence = {};
      if (startDate) where.dateAbsence.gte = new Date(startDate);
      if (endDate) where.dateAbsence.lte = new Date(endDate);
    }
    const absences = await prisma.absence.findMany({ where, include: { employe: true } });
    const rows = [
      ['Matricule', 'Employe', 'Date', 'Type', 'Jours', 'Justification'],
      ...absences.map((row) => [
        row.matricule,
        row.employe?.nomComplet || `${row.employe?.prenoms || ''} ${row.employe?.nom || ''}`.trim(),
        row.dateAbsence ? new Date(row.dateAbsence).toISOString().slice(0, 10) : '',
        row.typeAbsence || '',
        row.nombreJours ?? '',
        row.justification || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="presences-export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = mapPresenceToAbsence(req.body);
    const created = await prisma.absence.create({
      data: payload,
      include: { employe: true },
    });
    res.status(201).json({ success: true, data: mapAbsenceToPresence(created) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Identifiant invalide' });
    }
    const payload = mapPresenceToAbsence(req.body);
    const updated = await prisma.absence.update({
      where: { id },
      data: payload,
      include: { employe: true },
    });
    res.json({ success: true, data: mapAbsenceToPresence(updated) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.pointage = async (req, res) => {
  try {
    const { employeId, type } = req.body;
    const now = new Date();
    const created = await prisma.absence.create({
      data: {
        matricule: employeId,
        dateAbsence: now,
        typeAbsence: type === 'arrivee' ? 'ARRIVEE' : 'DEPART',
        nombreJours: 0,
      },
      include: { employe: true },
    });
    res.status(201).json({ success: true, data: mapAbsenceToPresence(created) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
