const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');
const { sendMail } = require('../services/mailer.service');

exports.createFormation = asyncHandler(async (req, res) => {
    const formation = await prisma.formation.create({ data: req.body });
    res.status(201).json(formation);
});

exports.getFormations = asyncHandler(async (req, res) => {
    const formations = await prisma.formation.findMany({
        include: { plan: true, inscriptions: { include: { formation: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(formations);
});

exports.createInscription = asyncHandler(async (req, res) => {
    const insc = await prisma.inscriptionFormation.create({ data: req.body });
    
    // Notification à l'employé
    const employe = await prisma.employe.findUnique({ where: { matricule: req.body.matricule } });
    const formation = await prisma.formation.findUnique({ where: { id: req.body.formationId } });

    if (employe && employe.emailPersonnel) {
        await sendMail(
            employe.emailPersonnel,
            'Inscription à une Formation Validée',
            `<h3>Bonjour ${employe.prenoms},</h3><p>Nous vous confirmons votre inscription à la formation <strong>"${formation.titre}"</strong>.</p><p>Veuillez consulter votre portail pour plus de détails.</p>`
        );
    }

    res.status(201).json(insc);
});
