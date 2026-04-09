const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

// CRUD de base
exports.getAllConges = factory.getAll('gestionConge');
exports.getConge = factory.getOne('gestionConge');
exports.deleteConge = factory.deleteOne('gestionConge');

exports.createConge = asyncHandler(async (req, res, next) => {
    // Calculer les données de congé (par exemple on suppose que les dates sont envoyées)
    const conge = await prisma.gestionConge.create({
        data: {
            ...req.body,
            statut: "En attente" // Par défaut
        }
    });
    res.status(201).json(conge);
});

exports.approuverConge = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const conge = await prisma.gestionConge.update({
        where: { id: Number(id) },
        data: {
            statut: "Approuvé",
            dateApprobation: new Date()
        }
    });
    res.status(200).json(conge);
});
