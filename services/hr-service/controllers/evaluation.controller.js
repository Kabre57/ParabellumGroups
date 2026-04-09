const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

exports.getAllEvaluations = factory.getAll('evaluation');
exports.getEvaluation = factory.getOne('evaluation');
exports.deleteEvaluation = factory.deleteOne('evaluation');
exports.updateEvaluation = factory.updateOne('evaluation');

exports.createEvaluation = asyncHandler(async (req, res, next) => {
    // Vérifier employés et évaluateurs
    const { employeId, evaluateurId, periode, dateEvaluation, noteGlobale, competences } = req.body;
    
    const newEvaluation = await prisma.evaluation.create({
        data: {
            employeId,
            evaluateurId,
            periode,
            dateEvaluation: new Date(dateEvaluation),
            noteGlobale,
            competences,
            commentaires: req.body.commentaires,
            objectifs: req.body.objectifs
        }
    });

    res.status(201).json(newEvaluation);
});
