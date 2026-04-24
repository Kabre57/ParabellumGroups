const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

const toDate = (value) => (value ? new Date(value) : undefined);
const toNumber = (value) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined);

const buildLoanData = (body) => {
    const data = {};
    const matricule = body.matricule || body.employeId || body.employeeId;
    const montantTotal = body.montantTotalPrete ?? body.montantInitial ?? body.amount;
    const montantRestant = body.montantRestantDu ?? body.restantDu ?? body.remainingAmount;
    const mensualite = body.mensualiteRetenue ?? body.deductionMensuelle ?? body.monthlyDeduction;

    if (matricule) data.matricule = String(matricule);
    if (body.datePret) data.datePret = toDate(body.datePret);
    if (montantTotal !== undefined) data.montantTotalPrete = toNumber(montantTotal);
    if (montantRestant !== undefined) data.montantRestantDu = toNumber(montantRestant);
    if (body.nombreMoisRemboursement ?? body.nombreMois) {
        data.nombreMoisRemboursement = Number(body.nombreMoisRemboursement ?? body.nombreMois);
    }
    if (mensualite !== undefined) data.mensualiteRetenue = toNumber(mensualite);
    if (body.dateDebutRemboursement || body.dateDebut) data.dateDebutRemboursement = toDate(body.dateDebutRemboursement || body.dateDebut);
    if (body.dateFinRemboursement || body.dateFin) data.dateFinRemboursement = toDate(body.dateFinRemboursement || body.dateFin);
    if (body.nombreMoisPayes !== undefined) data.nombreMoisPayes = Number(body.nombreMoisPayes);
    if (body.statut || body.status) data.statut = body.statut || body.status;
    if (body.motifPret || body.motif) data.motifPret = body.motifPret || body.motif;

    return data;
};

exports.getAllLoans = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, employeId, matricule, statut } = req.query;
    const where = {};
    const matriculeFilter = matricule || employeId;
    if (matriculeFilter) where.matricule = String(matriculeFilter);
    if (statut) where.statut = String(statut);

    const take = Math.max(1, Math.min(Number(limit) || 50, 500));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;

    const [data, total] = await Promise.all([
        prisma.pretAvance.findMany({
            where,
            include: { employe: true },
            orderBy: { datePret: 'desc' },
            skip,
            take
        }),
        prisma.pretAvance.count({ where })
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
exports.getLoan = factory.getOne('pretAvance');
exports.deleteLoan = factory.deleteOne('pretAvance');

exports.createLoan = asyncHandler(async (req, res, next) => {
    const data = buildLoanData(req.body);
    const montantTotalPrete = data.montantTotalPrete;
    
    const newLoan = await prisma.pretAvance.create({
        data: {
            ...data,
            datePret: data.datePret || new Date(),
            montantRestantDu: data.montantRestantDu ?? montantTotalPrete,
            nombreMoisPayes: data.nombreMoisPayes ?? 0,
            statut: data.statut || "En cours"
        }
    });

    res.status(201).json(newLoan);
});

// Update a loan
exports.updateLoan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const loan = await prisma.pretAvance.update({
        where: { id: Number(id) },
        data: buildLoanData(req.body)
    });
    res.status(200).json(loan);
});

exports.terminateLoan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const loan = await prisma.pretAvance.update({
        where: { id: Number(id) },
        data: {
            statut: 'Terminé',
            montantRestantDu: 0,
            dateFinRemboursement: new Date()
        }
    });
    res.status(200).json(loan);
});
