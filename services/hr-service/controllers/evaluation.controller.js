const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const mapEvaluationPayload = (payload) => ({
  matricule: payload.employeId ?? payload.matricule,
  dateEvenement: payload.dateEvaluation ? new Date(payload.dateEvaluation) : new Date(),
  typeMouvement: payload.typeMouvement || 'EVALUATION',
  ancienPoste: payload.ancienPoste,
  nouveauPoste: payload.nouveauPoste,
  ancienSalaire: payload.ancienSalaire,
  nouveauSalaire: payload.nouveauSalaire,
  motif: payload.commentaires || payload.motif,
  observations: payload.observations || payload.commentaireEvaluateur || payload.commentaireEmploye,
});

const mapToEvaluation = (row) => ({
  id: row.id,
  employeId: row.matricule,
  dateEvaluation: row.dateEvenement,
  periode: row.dateEvenement ? new Date(row.dateEvenement).toISOString().slice(0, 7) : '',
  noteGlobale: 0,
  competences: {},
  objectifs: {},
  pointsForts: '',
  pointsAmeliorer: '',
  planAction: '',
  commentaireEmploye: '',
  commentaireEvaluateur: row.observations,
  status: 'TERMINE',
  employe: row.employe,
});

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, employeId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (employeId) where.matricule = employeId;
    const [items, total] = await Promise.all([
      prisma.historiqueEmploye.findMany({
        where,
        include: { employe: true },
        orderBy: { dateEvenement: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.historiqueEmploye.count({ where }),
    ]);
    res.json({
      success: true,
      data: items.map(mapToEvaluation),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, Number(limit)))),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByEmploye = async (req, res) => {
  try {
    const { employeId } = req.params;
    const items = await prisma.historiqueEmploye.findMany({
      where: { matricule: employeId },
      include: { employe: true },
      orderBy: { dateEvenement: 'desc' },
    });
    res.json({ success: true, data: items.map(mapToEvaluation) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.historiqueEmploye.findUnique({
      where: { id },
      include: { employe: true },
    });
    if (!item) return res.status(404).json({ success: false, error: 'Evaluation introuvable' });
    res.json({ success: true, data: mapToEvaluation(item) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const created = await prisma.historiqueEmploye.create({
      data: mapEvaluationPayload(req.body),
      include: { employe: true },
    });
    res.status(201).json({ success: true, data: mapToEvaluation(created) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.historiqueEmploye.update({
      where: { id },
      data: mapEvaluationPayload(req.body),
      include: { employe: true },
    });
    res.json({ success: true, data: mapToEvaluation(updated) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.historiqueEmploye.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
