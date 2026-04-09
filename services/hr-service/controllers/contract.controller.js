const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

// CRUD de base 
exports.getAllContrats = factory.getAll('contrat');
exports.getContrat = factory.getOne('contrat');
exports.deleteContrat = factory.deleteOne('contrat');

exports.createContrat = asyncHandler(async (req, res, next) => {
    const { matricule } = req.body;
    
    // S'assurer que l'employé existe
    const employe = await prisma.employe.findUnique({ where: { matricule } });
    if(!employe) {
        return res.status(404).json({ error: "L'employé avec ce matricule est introuvable." });
    }

    const newContrat = await prisma.contrat.create({
        data: req.body,
    });
    res.status(201).json(newContrat);
});

exports.updateContrat = factory.updateOne('contrat');

// Méthode spécifique : rompre le contrat
exports.rompreContrat = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { dateRupture, motifRupture, indemnitePreavis, indemniteLicenciement, indemniteCongesPayes } = req.body;
    
    // Mettre à jour le contrat (date de fin)
    const contrat = await prisma.contrat.update({
        where: { id: Number(id) },
        data: {
            statutContrat: "Rompu",
            dateFinReelle: dateRupture
        }
    });

    // Créer la ligne de rupture
    const rupture = await prisma.ruptureContrat.create({
        data: {
            contratId: contrat.id,
            matricule: contrat.matricule,
            dateRupture,
            motifRupture,
            indemnitePreavis,
            indemniteLicenciement,
            indemniteCongesPayes,
        }
    });

    res.status(200).json({ contrat, rupture });
});
