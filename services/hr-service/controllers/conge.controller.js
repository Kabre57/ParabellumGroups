const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

const toDate = (value) => (value ? new Date(value) : undefined);

const normalizeStatus = (value) => {
    const status = String(value || '').toUpperCase();
    if (['APPROUVE', 'APPROUVÉ', 'APPROVED'].includes(status)) return 'Approuvé';
    if (['REFUSE', 'REJETE', 'REJETÉ', 'REJECTED'].includes(status)) return 'Refusé';
    if (['ANNULE', 'ANNULÉ', 'CANCELLED'].includes(status)) return 'Annulé';
    return 'En attente';
};

const buildCongeData = (body) => {
    const data = {};
    const matricule = body.matricule || body.employeId || body.employeeId;
    const nombreJours = body.nombreJours ?? body.nbJours ?? body.totalDays;
    const observations = body.observations || body.commentaire || body.motif || body.reason;

    if (matricule) data.matricule = String(matricule);
    if (body.typeConge || body.leaveType) data.typeConge = body.typeConge || body.leaveType;
    if (body.dateDebut || body.startDate) data.dateDebut = toDate(body.dateDebut || body.startDate);
    if (body.dateFin || body.endDate) data.dateFin = toDate(body.dateFin || body.endDate);
    if (nombreJours !== undefined) data.nombreJours = Number(nombreJours);
    if (observations !== undefined) data.observations = observations;
    if (body.statut || body.status) data.statut = normalizeStatus(body.statut || body.status);

    return data;
};

exports.getAllConges = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        employeId,
        matricule,
        typeConge,
        status,
        statut,
        startDate,
        endDate,
        sortBy = 'dateDemande',
        sortOrder = 'desc'
    } = req.query;

    const where = {};
    const matriculeFilter = matricule || employeId;
    if (matriculeFilter) where.matricule = String(matriculeFilter);
    if (typeConge) where.typeConge = String(typeConge);
    if (status || statut) where.statut = normalizeStatus(status || statut);
    if (startDate || endDate) {
        where.AND = [];
        if (endDate) where.AND.push({ dateDebut: { lte: toDate(endDate) } });
        if (startDate) where.AND.push({ dateFin: { gte: toDate(startDate) } });
    }

    const allowedSorts = new Set(['dateDemande', 'dateDebut', 'dateFin', 'statut', 'typeConge']);
    const safeSortBy = allowedSorts.has(sortBy) ? sortBy : 'dateDemande';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const take = Math.max(1, Math.min(Number(limit) || 50, 500));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;

    const [data, total] = await Promise.all([
        prisma.gestionConge.findMany({
            where,
            include: { employe: true },
            orderBy: { [safeSortBy]: safeSortOrder },
            skip,
            take
        }),
        prisma.gestionConge.count({ where })
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
exports.getConge = factory.getOne('gestionConge');
exports.deleteConge = factory.deleteOne('gestionConge');

exports.createConge = asyncHandler(async (req, res, next) => {
    const data = buildCongeData(req.body);
    const conge = await prisma.gestionConge.create({
        data: {
            ...data,
            statut: data.statut || "En attente",
            dateDemande: new Date()
        }
    });
    res.status(201).json(conge);
});

exports.updateConge = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const conge = await prisma.gestionConge.update({
        where: { id: Number(id) },
        data: buildCongeData(req.body)
    });
    res.status(200).json(conge);
});

exports.approuverConge = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const conge = await prisma.gestionConge.update({
        where: { id: Number(id) },
        data: {
            statut: "Approuvé",
            dateApprobation: new Date(),
            observations: req.body.commentaire || undefined
        }
    });
    res.status(200).json(conge);
});

exports.refuserConge = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const conge = await prisma.gestionConge.update({
        where: { id: Number(id) },
        data: {
            statut: "Refusé",
            dateApprobation: new Date(),
            observations: req.body.commentaire || undefined
        }
    });
    res.status(200).json(conge);
});

exports.getCalendrier = asyncHandler(async (req, res) => {
    req.query.sortBy = req.query.sortBy || 'dateDebut';
    req.query.limit = req.query.limit || 500;
    return exports.getAllConges(req, res);
});

exports.getSolde = asyncHandler(async (req, res) => {
    const { employeId } = req.params;
    const employe = await prisma.employe.findFirst({
        where: {
            OR: [
                { id: employeId },
                { matricule: employeId }
            ]
        }
    });
    const matricule = employe?.matricule || employeId;

    const pris = await prisma.gestionConge.aggregate({
        where: {
            matricule,
            statut: { in: ['Approuvé', 'APPROUVE', 'APPROUVÉ'] }
        },
        _sum: { nombreJours: true }
    });

    const annuel = 30;
    const maladie = 10;
    const sanssolde = 0;
    const prisAnnuel = Number(pris._sum.nombreJours || 0);

    res.status(200).json({
        success: true,
        data: {
            employeId,
            annuel,
            maladie,
            sanssolde,
            pris: { annuel: prisAnnuel, maladie: 0, sanssolde: 0 },
            restant: { annuel: Math.max(0, annuel - prisAnnuel), maladie, sanssolde }
        }
    });
});
