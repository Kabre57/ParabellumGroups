const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');
const { sendMail } = require('../services/mailer.service');

exports.createOffre = asyncHandler(async (req, res) => {
    const offre = await prisma.offreEmploi.create({ data: req.body });
    res.status(201).json(offre);
});

exports.getOffres = asyncHandler(async (req, res) => {
    const offres = await prisma.offreEmploi.findMany({
        include: { _count: { select: { candidatures: true } } },
        orderBy: { dateOuverture: 'desc' }
    });
    res.status(200).json(offres);
});

exports.createCandidature = asyncHandler(async (req, res) => {
    const candidature = await prisma.candidature.create({ data: req.body });
    
    // Notification par email au RH
    await sendMail(
        'rh@logipaie.ci', 
        'Nouvelle Candidature Reçue', 
        `<h3>Nouvelle candidature reçue</h3><p>Une candidature a été soumise par <strong>${req.body.prenomCandidat} ${req.body.nomCandidat}</strong> pour l'offre ID: ${req.body.offreId}.</p>`
    );

    res.status(201).json(candidature);
});

exports.getCandidatures = asyncHandler(async (req, res) => {
    const candidatures = await prisma.candidature.findMany({
        include: { offre: true, entretiens: true },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(candidatures);
});

exports.updateCandidature = asyncHandler(async (req, res) => {
    const candidature = await prisma.candidature.update({
        where: { id: parseInt(req.params.id) },
        data: req.body
    });

    if (req.body.statut === 'Entretien') {
        await sendMail(
            candidature.email,
            'Convocation à un entretien',
            `<p>Bonjour ${candidature.prenomCandidat},</p><p>Votre profil a retenu notre attention. Nous reviendrons vers vous très prochainement pour planifier un entretien.</p><p>L'équipe Recrutement</p>`
        );
    }

    res.status(200).json(candidature);
});
