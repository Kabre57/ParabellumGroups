const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

exports.getAllLoans = factory.getAll('pretAvance');
exports.getLoan = factory.getOne('pretAvance');
exports.deleteLoan = factory.deleteOne('pretAvance');

exports.createLoan = asyncHandler(async (req, res, next) => {
    // on fixe le montant restant dû au montant total au départ
    const { montantTotalPrete } = req.body;
    
    const newLoan = await prisma.pretAvance.create({
        data: {
            ...req.body,
            montantRestantDu: montantTotalPrete,
            nombreMoisPayes: 0,
            statut: "En cours"
        }
    });

    res.status(201).json(newLoan);
});

// Update a loan
exports.updateLoan = factory.updateOne('pretAvance');
