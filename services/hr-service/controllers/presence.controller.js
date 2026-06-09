const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

const startOfDay = (date = new Date()) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const endOfDay = (date = new Date()) => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
};

const resolveMatricule = async (employeeId) => {
    if (!employeeId) return null;
    const employe = await prisma.employe.findFirst({
        where: {
            OR: [
                { id: String(employeeId) },
                { matricule: String(employeeId) }
            ]
        }
    });
    return employe?.matricule || null;
};

const toDate = (value) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const toHours = (start, end) => {
    if (!start || !end) return undefined;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (!Number.isFinite(diff) || diff <= 0) return undefined;
    return Math.round((diff / 3600000) * 100) / 100;
};

const mapPresence = (presence) => ({
    id: String(presence.id),
    employeId: presence.matricule,
    employe: presence.employe ? {
        id: presence.employe.id,
        nom: presence.employe.nom || '',
        prenom: presence.employe.prenoms || '',
        matricule: presence.employe.matricule
    } : undefined,
    date: presence.date,
    type: presence.type || 'BUREAU',
    heureArrivee: presence.heureArrivee,
    heureDepart: presence.heureDepart,
    heuresTravaillees: presence.heuresTravaillees ? Number(presence.heuresTravaillees) : 0,
    notes: presence.notes,
    createdAt: presence.createdAt,
    updatedAt: presence.updatedAt
});

const buildPresenceWhere = async (query = {}, employeeId) => {
    const where = {};
    const matricule = await resolveMatricule(employeeId || query.employeId || query.employeeId || query.matricule);
    if (matricule) where.matricule = matricule;
    if (query.type) where.type = String(query.type).toUpperCase();

    const startDate = toDate(query.startDate || query.dateDebut);
    const endDate = toDate(query.endDate || query.dateFin);
    if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startOfDay(startDate);
        if (endDate) where.date.lte = endOfDay(endDate);
    }

    return where;
};

exports.getPresencesByEmploye = asyncHandler(async (req, res) => {
    const where = await buildPresenceWhere(req.query, req.params.employeId);
    const data = await prisma.presence.findMany({
        where,
        include: { employe: true },
        orderBy: { date: 'desc' }
    });

    res.status(200).json({
        success: true,
        data: data.map(mapPresence),
        meta: {
            pagination: {
                total: data.length,
                page: 1,
                limit: data.length,
                totalPages: 1
            }
        }
    });
});

exports.getPresenceStats = asyncHandler(async (req, res) => {
    const where = await buildPresenceWhere(req.query);
    const presences = await prisma.presence.findMany({ where });
    const parType = {
        BUREAU: 0,
        TELETRAVAIL: 0,
        DEPLACEMENT: 0,
        ABSENCE: 0
    };

    let heuresTotal = 0;
    presences.forEach((presence) => {
        const type = presence.type || 'BUREAU';
        if (parType[type] !== undefined) parType[type] += 1;
        heuresTotal += Number(presence.heuresTravaillees || 0);
    });

    const totalJours = presences.length;
    const joursPresence = totalJours - parType.ABSENCE;

    res.status(200).json({
        success: true,
        data: {
            totalJours,
            parType,
            heuresTotal,
            moyenneHeuresParJour: totalJours ? heuresTotal / totalJours : 0,
            tauxPresence: totalJours ? Math.round((joursPresence / totalJours) * 10000) / 100 : 0
        }
    });
});

exports.exportPresences = asyncHandler(async (req, res) => {
    const where = await buildPresenceWhere(req.query);
    const presences = await prisma.presence.findMany({
        where,
        include: { employe: true },
        orderBy: { date: 'asc' }
    });

    const rows = [
        ['Matricule', 'Nom', 'Prenoms', 'Date', 'Type', 'Arrivee', 'Depart', 'Heures', 'Notes'],
        ...presences.map((presence) => [
            presence.matricule,
            presence.employe?.nom || '',
            presence.employe?.prenoms || '',
            presence.date?.toISOString?.().slice(0, 10) || '',
            presence.type || '',
            presence.heureArrivee?.toISOString?.() || '',
            presence.heureDepart?.toISOString?.() || '',
            String(presence.heuresTravaillees || 0),
            presence.notes || ''
        ])
    ];

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=presences.csv');
    res.status(200).send(csv);
});

exports.createPresence = asyncHandler(async (req, res) => {
    const matricule = await resolveMatricule(req.body.employeId || req.body.employeeId || req.body.matricule);
    if (!matricule) return res.status(404).json({ error: 'Employe introuvable' });

    const heureArrivee = toDate(req.body.heureArrivee);
    const heureDepart = toDate(req.body.heureDepart);

    const presence = await prisma.presence.create({
        data: {
            matricule,
            date: toDate(req.body.date) || new Date(),
            type: String(req.body.type || 'BUREAU').toUpperCase(),
            heureArrivee,
            heureDepart,
            heuresTravaillees: req.body.heuresTravaillees ?? toHours(heureArrivee, heureDepart),
            notes: req.body.notes
        },
        include: { employe: true }
    });

    res.status(201).json({ success: true, data: mapPresence(presence) });
});

exports.updatePresence = asyncHandler(async (req, res) => {
    const existing = await prisma.presence.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Presence introuvable' });

    const heureArrivee = req.body.heureArrivee !== undefined ? toDate(req.body.heureArrivee) : existing.heureArrivee;
    const heureDepart = req.body.heureDepart !== undefined ? toDate(req.body.heureDepart) : existing.heureDepart;

    const presence = await prisma.presence.update({
        where: { id: existing.id },
        data: {
            date: req.body.date ? toDate(req.body.date) : undefined,
            type: req.body.type ? String(req.body.type).toUpperCase() : undefined,
            heureArrivee: req.body.heureArrivee !== undefined ? heureArrivee : undefined,
            heureDepart: req.body.heureDepart !== undefined ? heureDepart : undefined,
            heuresTravaillees: req.body.heuresTravaillees ?? toHours(heureArrivee, heureDepart),
            notes: req.body.notes
        },
        include: { employe: true }
    });

    res.status(200).json({ success: true, data: mapPresence(presence) });
});

exports.pointage = asyncHandler(async (req, res) => {
    const matricule = await resolveMatricule(req.body.employeId || req.body.employeeId || req.body.matricule);
    if (!matricule) return res.status(404).json({ error: 'Employe introuvable' });

    const now = new Date();
    const today = startOfDay(now);
    const existing = await prisma.presence.findFirst({
        where: {
            matricule,
            date: {
                gte: today,
                lte: endOfDay(now)
            }
        }
    });

    const isDeparture = String(req.body.type || '').toLowerCase() === 'depart';
    const data = isDeparture
        ? {
            heureDepart: now,
            heuresTravaillees: toHours(existing?.heureArrivee, now)
        }
        : {
            date: today,
            type: 'BUREAU',
            heureArrivee: now
        };

    const presence = existing
        ? await prisma.presence.update({
            where: { id: existing.id },
            data,
            include: { employe: true }
        })
        : await prisma.presence.create({
            data: {
                matricule,
                ...data
            },
            include: { employe: true }
        });

    res.status(200).json({ success: true, data: mapPresence(presence) });
});

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
