const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');
const { sendMail } = require('../services/mailer.service');

// @desc    Récupérer les infos de l'employé connecté
// @route   GET /api/portal/me
exports.getMesInfos = asyncHandler(async (req, res) => {
    // req.user est injecté par le middleware d'authentification
    const employe = await prisma.employe.findUnique({
        where: { matricule: req.user.matricule },
        include: {
            contrats: true,
            variablesMensuelles: { take: 1, orderBy: { periode: 'desc' } },
        }
    });

    if (employe) {
        res.json(employe);
    } else {
        res.status(404).json({ message: "Employé introuvable dans la base RH." });
    }
});

// @desc    Soumettre une demande de congés via le portail
// @route   POST /api/portal/conges
exports.soumettreConge = asyncHandler(async (req, res) => {
    const { typeConge, dateDebut, dateFin, nombreJours, motif } = req.body;

    const demande = await prisma.demandeConge.create({
        data: {
            userId: req.user.id,
            matricule: req.user.matricule,
            typeConge,
            dateDebut: new Date(dateDebut),
            dateFin: new Date(dateFin),
            nombreJours,
            motif,
        }
    });

    // Notify RH
    await sendMail(
        'rh@logipaie.ci',
        'Nouvelle Demande de Congés',
        `L'employé avec le matricule ${req.user.matricule} a soumis une demande de congés de ${nombreJours} jours.`
    );

    res.status(201).json(demande);
});

// @desc    Récupérer l'historique des demandes de congés de l'employé
// @route   GET /api/portal/conges
exports.mesConges = asyncHandler(async (req, res) => {
    const congés = await prisma.demandeConge.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });
    res.json(congés);
});

// @desc    Soumettre une demande de prêt/avance
// @route   POST /api/portal/prets
exports.soumettrePret = asyncHandler(async (req, res) => {
    const { typePret, montantDemande, dureeRemboursement, motif } = req.body;

    const demande = await prisma.demandePret.create({
        data: {
            userId: req.user.id,
            matricule: req.user.matricule,
            typePret,
            montantDemande,
            dureeRemboursement,
            motif,
        }
    });

    res.status(201).json(demande);
});

// @desc    Récupérer les demandes de prêts de l'employé
// @route   GET /api/portal/prets
exports.mesPrets = asyncHandler(async (req, res) => {
    const prets = await prisma.demandePret.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });
    res.json(prets);
});
