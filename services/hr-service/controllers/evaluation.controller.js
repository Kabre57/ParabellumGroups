const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

const toDate = (value) => (value ? new Date(value) : undefined);

const resolveEmployeId = async (value) => {
    if (!value) return null;
    const identifier = String(value);
    const employe = await prisma.employe.findFirst({
        where: {
            OR: [
                { id: identifier },
                { matricule: identifier }
            ]
        }
    });
    return employe?.id || null;
};

const includeEvaluationRelations = {
    employe: {
        include: {
            contrats: { orderBy: { dateDebut: 'desc' }, take: 1 }
        }
    },
    evaluateur: {
        include: {
            contrats: { orderBy: { dateDebut: 'desc' }, take: 1 }
        }
    }
};

const buildEvaluationData = (body = {}) => {
    const data = {
        dateEvaluation: toDate(body.dateEvaluation),
        periode: body.periode,
        noteGlobale: body.noteGlobale !== undefined ? Number(body.noteGlobale) : undefined,
        competences: body.competences,
        commentaires: body.commentaires || body.commentaireEvaluateur || body.comments,
        objectifs: body.objectifs
    };

    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    return data;
};

exports.getAllEvaluations = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, evaluateurId, periode } = req.query;
    const employeId = req.params.employeId || req.query.employeId;
    const where = {};

    if (employeId) {
        const resolved = await resolveEmployeId(employeId);
        if (resolved) where.employeId = resolved;
    }
    if (evaluateurId) {
        const resolved = await resolveEmployeId(evaluateurId);
        if (resolved) where.evaluateurId = resolved;
    }
    if (periode) where.periode = String(periode);

    const take = Math.max(1, Math.min(Number(limit) || 50, 500));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;

    const [data, total] = await Promise.all([
        prisma.evaluation.findMany({
            where,
            include: includeEvaluationRelations,
            orderBy: { dateEvaluation: 'desc' },
            skip,
            take
        }),
        prisma.evaluation.count({ where })
    ]);

    res.status(200).json({
        data,
        pagination: {
            total,
            page: currentPage,
            limit: take,
            totalPages: Math.max(1, Math.ceil(total / take))
        }
    });
});

exports.getEvaluation = asyncHandler(async (req, res) => {
    const evaluation = await prisma.evaluation.findUnique({
        where: { id: req.params.id },
        include: includeEvaluationRelations
    });
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' });
    res.status(200).json(evaluation);
});

exports.deleteEvaluation = factory.deleteOne('evaluation');

exports.updateEvaluation = asyncHandler(async (req, res) => {
    const evaluation = await prisma.evaluation.update({
        where: { id: req.params.id },
        data: buildEvaluationData(req.body),
        include: includeEvaluationRelations
    });
    res.status(200).json(evaluation);
});

exports.createEvaluation = asyncHandler(async (req, res, next) => {
    // Vérifier employés et évaluateurs
    const { employeId, evaluateurId, periode, dateEvaluation, noteGlobale, competences } = req.body;
    const resolvedEmployeId = await resolveEmployeId(employeId);
    const resolvedEvaluateurId = await resolveEmployeId(evaluateurId);

    if (!resolvedEmployeId || !resolvedEvaluateurId) {
        return res.status(404).json({ error: 'Employé ou évaluateur introuvable' });
    }
    
    const newEvaluation = await prisma.evaluation.create({
        data: {
            employeId: resolvedEmployeId,
            evaluateurId: resolvedEvaluateurId,
            periode,
            dateEvaluation: new Date(dateEvaluation),
            noteGlobale: Number(noteGlobale),
            competences,
            commentaires: req.body.commentaires,
            objectifs: req.body.objectifs
        },
        include: includeEvaluationRelations
    });

    res.status(201).json(newEvaluation);
});
