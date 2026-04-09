const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

exports.getAllAbsences = factory.getAll('absence');
exports.getAbsence = factory.getOne('absence');
exports.createAbsence = factory.createOne('absence');
exports.updateAbsence = factory.updateOne('absence');
exports.deleteAbsence = factory.deleteOne('absence');

// Les Variables Mensuelles, qui centralisent les absences, heures supp, etc. pour un mois
exports.getAllVariables = factory.getAll('variablesMensuelle');

exports.saisirVariables = asyncHandler(async (req, res, next) => {
    // Upsert pour saisir ou modifier les variables mensuelles d'un employé poour un mois précis
    let { matricule, periode } = req.body;
    
    // verifier si ca existe deja
    const existing = await prisma.variablesMensuelle.findFirst({
        where: { matricule, periode }
    });

    let result;
    if (existing) {
        result = await prisma.variablesMensuelle.update({
            where: { id: existing.id },
            data: req.body
        });
    } else {
        result = await prisma.variablesMensuelle.create({
            data: { ...req.body, statut: "Validé" }
        });
    }

    res.status(200).json(result);
});
