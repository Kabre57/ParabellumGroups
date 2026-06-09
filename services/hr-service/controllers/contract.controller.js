const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');

const toDate = (...values) => {
    for (const value of values) {
        if (!value) continue;
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date;
    }
    return undefined;
};
const toNumber = (...values) => {
    for (const value of values) {
        if (value === undefined || value === null || value === '') continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return undefined;
};

const pickText = (...values) => {
    for (const value of values) {
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (normalized) return normalized;
    }
    return undefined;
};

const normalizeContractStatus = (value, fallback = 'Actif') => {
    if (value === undefined || value === null || value === '') return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (['termine', 'terminé', 'rompu', 'rupture', 'inactif', 'inactive'].includes(normalized)) return 'Terminé';
    return 'Actif';
};

const buildContratData = (body = {}, { isCreate = false } = {}) => {
    const data = {
        matricule: pickText(body.matricule, body.employeeId, body.employeId),
        typeContrat: pickText(body.typeContrat, body.contractType, body.type),
        dateSignature: toDate(body.dateSignature, body.signedDate),
        dateDebut: toDate(body.dateDebut || body.startDate),
        dateFinPrevue: toDate(body.dateFinPrevue || body.dateFin || body.endDate),
        dateFinReelle: toDate(body.dateFinReelle || body.actualEndDate),
        posteOccupe: pickText(body.posteOccupe, body.poste, body.position),
        direction: pickText(body.direction),
        service: pickText(body.service, body.departement, body.department),
        categorieProfessionnelle: pickText(body.categorieProfessionnelle, body.category),
        echelon: toNumber(body.echelon),
        regime: pickText(body.regime),
        typeEmploi: pickText(body.typeEmploi, body.employmentType),
        salaireBaseMensuel: toNumber(body.salaireBaseMensuel ?? body.salaireBase ?? body.salary),
        periodeEssaiMois: toNumber(body.periodeEssaiMois, body.trialPeriodMonths),
        dureeCddMois: toNumber(body.dureeCddMois, body.durationMonths),
        motifRecrutement: pickText(body.motifRecrutement, body.recruitmentReason),
        lieuTravail: pickText(body.lieuTravail, body.workLocation),
        statutContrat: normalizeContractStatus(body.statutContrat ?? body.statut ?? body.status, isCreate ? 'Actif' : undefined)
    };

    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    return data;
};

exports.getAllContrats = asyncHandler(async (req, res) => {
    const { employeeId, matricule, contractType, status } = req.query;
    const where = {};
    const employeeFilter = matricule || employeeId;
    if (employeeFilter) where.matricule = String(employeeFilter);
    if (contractType) where.typeContrat = { equals: String(contractType), mode: 'insensitive' };
    if (status) where.statutContrat = { equals: normalizeContractStatus(status), mode: 'insensitive' };

    const contrats = await prisma.contrat.findMany({
        where,
        include: { employe: true },
        orderBy: { dateCreation: 'desc' }
    });

    res.status(200).json(contrats);
});

exports.getContrat = asyncHandler(async (req, res) => {
    const contrat = await prisma.contrat.findUnique({
        where: { id: Number(req.params.id) },
        include: { employe: true }
    });
    if (!contrat) return res.status(404).json({ error: 'Contrat introuvable' });
    res.status(200).json(contrat);
});

exports.deleteContrat = factory.deleteOne('contrat');

exports.createContrat = asyncHandler(async (req, res, next) => {
    const data = buildContratData(req.body, { isCreate: true });
    const { matricule } = data;
    
    // S'assurer que l'employé existe
    const employe = await prisma.employe.findUnique({ where: { matricule } });
    if(!employe) {
        return res.status(404).json({ error: "L'employé avec ce matricule est introuvable." });
    }

    const newContrat = await prisma.contrat.create({
        data,
        include: { employe: true }
    });
    res.status(201).json(newContrat);
});

exports.updateContrat = asyncHandler(async (req, res) => {
    const contrat = await prisma.contrat.update({
        where: { id: Number(req.params.id) },
        data: buildContratData(req.body),
        include: { employe: true }
    });
    res.status(200).json(contrat);
});

// Méthode spécifique : rompre le contrat
exports.rompreContrat = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { dateRupture, motifRupture, indemnitePreavis, indemniteLicenciement, indemniteCongesPayes } = req.body;
    
    // Mettre à jour le contrat (date de fin)
    const contrat = await prisma.contrat.update({
        where: { id: Number(id) },
        data: {
            statutContrat: "Terminé",
            dateFinReelle: toDate(dateRupture)
        }
    });

    // Créer la ligne de rupture
    const rupture = await prisma.ruptureContrat.create({
        data: {
            contratId: contrat.id,
            matricule: contrat.matricule,
            dateRupture: toDate(dateRupture),
            motifRupture,
            indemnitePreavis,
            indemniteLicenciement,
            indemniteCongesPayes,
        }
    });

    res.status(200).json({ contrat, rupture });
});
