const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');
const logipaieService = require('../services/logipaie.service');

exports.getAllBulletins = factory.getAll('bulletinPaie');
exports.getBulletin = factory.getOne('bulletinPaie');
exports.deleteBulletin = factory.deleteOne('bulletinPaie');

// Calcul de la paie pour un employé pour un mois donné
exports.calculerPaie = asyncHandler(async (req, res, next) => {
    const { matricule, periode } = req.body;

    const employe = await prisma.employe.findUnique({
        where: { matricule },
        include: { contrats: { where: { statutContrat: 'Actif' } } }
    });

    if (!employe || employe.contrats.length === 0) {
        return res.status(404).json({ error: "Employé introuvable ou n'a pas de contrat actif." });
    }

    const contrat = employe.contrats[0];

    // Trouver les variables mensuelles
    const variables = await prisma.variablesMensuelle.findFirst({
        where: { matricule, periode }
    });

    // Chercher la config (taux d'imposition)
    const config = await prisma.configuration.findFirst();

    // Appeler le service métier Logipaie pour la Côte d'Ivoire
    const calculResult = logipaieService.calculerBulletin(employe, contrat, variables || {}, config);

    // Sauvegarder en DB
    const bulletin = await prisma.bulletinPaie.create({
        data: {
            matricule,
            periode,
            ...calculResult, // contient salaireBase, heuresSuppMontant, salaireBrut, cotisations...,
            variablesMensuelleId: variables ? variables.id : null,
            statutPaiement: "Non payé",
            coutTotalEmployeur: calculResult.coutTotalEmployeur
        }
    });

    res.status(201).json(bulletin);
});

// Traitement de la paie en masse
exports.traitementMasse = asyncHandler(async (req, res, next) => {
    const { periode } = req.body;
    
    // 1. Récupérer tous les employés avec contrats actifs
    const employes = await prisma.employe.findMany({
        where: { statut: 'Actif' },
        include: { 
            contrats: { where: { statutContrat: 'Actif' } },
            prets: { where: { statut: 'En cours' } } 
        }
    });

    const bulletinsCrees = [];

    for (const employe of employes) {
        if (employe.contrats.length === 0) continue;
        const contrat = employe.contrats[0];

        // 2. Chercher les variables mensuelles
        const variables = await prisma.variablesMensuelle.findFirst({
            where: { matricule: employe.matricule, periode }
        }) || {};

        // 3. Calculer
        const result = logipaieService.calculerBulletin(employe, contrat, variables, {});

        // 4. Gérer les prêts (Déduction automatique si reste à payer)
        let totalPretsADeduire = 0;
        for (const pret of employe.prets) {
            const mensualite = pret.montantTotalPrete / pret.nombreMoisRemboursement;
            const deduction = Math.min(mensualite, pret.montantRestantDu);
            totalPretsADeduire += deduction;

            // Mettre à jour le prêt
            await prisma.pretAvance.update({
                where: { id: pret.id },
                data: {
                    montantRestantDu: { decrement: deduction },
                    nombreMoisPayes: { increment: 1 },
                    statut: (pret.montantRestantDu - deduction) <= 0 ? "Terminé" : "En cours"
                }
            });
        }

        // 5. Créer le bulletin
        const bulletin = await prisma.bulletinPaie.upsert({
            where: { 
                matricule_periode: { matricule: employe.matricule, periode } 
            },
            update: {
                ...result,
                salaireNet: result.salaireNet - totalPretsADeduire,
                statutPaiement: "Non payé"
            },
            create: {
                matricule: employe.matricule,
                periode,
                ...result,
                salaireNet: result.salaireNet - totalPretsADeduire,
                statutPaiement: "Non payé"
            }
        });
        bulletinsCrees.push(bulletin.id);
    }
    
    res.status(200).json({ 
        message: "Traitement terminé", 
        count: bulletinsCrees.length,
        ids: bulletinsCrees 
    });
});

exports.getLivrePaieAnnuel = asyncHandler(async (req, res, next) => {
    const { annee } = req.query;
    const summaries = await prisma.bulletinPaie.groupBy({
        by: ['matricule'],
        where: { periode: { startsWith: annee } },
        _sum: {
            salaireBase: true,
            heuresSuppMontant: true,
            primesTotal: true,
            salaireBrut: true,
            cotisationCnpsSalariale: true,
            impotIs: true,
            impotCn: true,
            impotIgr: true,
            totalRetenues: true,
            salaireNet: true,
            coutTotalEmployeur: true
        }
    });
    res.status(200).json(summaries);
});
