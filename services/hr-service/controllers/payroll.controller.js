const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');
const logipaieService = require('../services/logipaie.service');

const toNumber = (value) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined);

const getPeriod = (source = {}) => {
    if (source.periode || source.period) return source.periode || source.period;

    const month = source.mois || source.month;
    const year = source.annee || source.year;
    if (month && year) return `${year}-${String(month).padStart(2, '0')}`;

    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const splitPeriod = (periode) => {
    const [year, month] = String(periode).split('-').map(Number);
    return { year, month };
};

const normalizeStatus = (value) => {
    const status = String(value || '').toUpperCase();
    if (['PAYE', 'PAYÉ', 'PAID'].includes(status)) return 'PAYE';
    if (['VALIDE', 'VALIDÉ', 'VALIDATED'].includes(status)) return 'VALIDE';
    if (['ANNULE', 'ANNULÉ', 'CANCELLED'].includes(status)) return 'ANNULE';
    return value || 'GENERE';
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

const buildBulletinData = (body) => {
    const data = {};
    const periode = getPeriod(body);

    data.periode = periode;
    if (body.salaireBase ?? body.baseSalary) data.salaireBase = toNumber(body.salaireBase ?? body.baseSalary);
    if (body.heuresSuppMontant) data.heuresSuppMontant = toNumber(body.heuresSuppMontant);
    if (body.primesTotal ?? body.bonuses) data.primesTotal = toNumber(body.primesTotal ?? body.bonuses);
    if (body.salaireBrut ?? body.grossSalary) data.salaireBrut = toNumber(body.salaireBrut ?? body.grossSalary);
    if (body.cotisationCnpsSalariale) data.cotisationCnpsSalariale = toNumber(body.cotisationCnpsSalariale);
    if (body.cotisationCnpsPatronale ?? body.socialContributions) {
        data.cotisationCnpsPatronale = toNumber(body.cotisationCnpsPatronale ?? body.socialContributions);
    }
    if (body.impotIs) data.impotIs = toNumber(body.impotIs);
    if (body.impotCn) data.impotCn = toNumber(body.impotCn);
    if (body.impotIgr ?? body.taxAmount) data.impotIgr = toNumber(body.impotIgr ?? body.taxAmount);
    if (body.totalRetenues ?? body.deductions) data.totalRetenues = toNumber(body.totalRetenues ?? body.deductions);
    if (body.salaireNet ?? body.netSalary) data.salaireNet = toNumber(body.salaireNet ?? body.netSalary);
    if (body.coutTotalEmployeur ?? body.totalEmployerCost) {
        data.coutTotalEmployeur = toNumber(body.coutTotalEmployeur ?? body.totalEmployerCost);
    }
    if (body.statutPaiement || body.statut || body.status) {
        data.statutPaiement = normalizeStatus(body.statutPaiement || body.statut || body.status);
    }
    if (body.datePaiement || body.paymentDate) data.datePaiement = new Date(body.datePaiement || body.paymentDate);
    if (body.referenceVirement) data.referenceVirement = body.referenceVirement;

    return data;
};

exports.getAllBulletins = asyncHandler(async (req, res) => {
    const {
        page = 1,
        pageSize,
        limit,
        month,
        year,
        employeeId,
        employeId,
        matricule,
        search
    } = req.query;

    const where = {};
    if (month && year) where.periode = getPeriod({ month, year });
    if (matricule) where.matricule = String(matricule);
    if (employeeId || employeId) {
        const resolved = await resolveMatricule(employeeId || employeId);
        if (resolved) where.matricule = resolved;
    }
    if (search) where.matricule = { contains: String(search), mode: 'insensitive' };

    const take = Math.max(1, Math.min(Number(pageSize || limit) || 50, 500));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;

    const [data, total] = await Promise.all([
        prisma.bulletinPaie.findMany({
            where,
            include: { employe: true },
            orderBy: { dateGeneration: 'desc' },
            skip,
            take
        }),
        prisma.bulletinPaie.count({ where })
    ]);

    res.status(200).json({
        data,
        page: currentPage,
        pageSize: take,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / take))
    });
});

exports.getBulletin = asyncHandler(async (req, res) => {
    const bulletin = await prisma.bulletinPaie.findUnique({
        where: { id: Number(req.params.id) },
        include: { employe: true }
    });

    if (!bulletin) return res.status(404).json({ error: 'Bulletin introuvable' });
    res.status(200).json(bulletin);
});

exports.createBulletin = asyncHandler(async (req, res) => {
    const matricule = await resolveMatricule(req.body.employeeId || req.body.employeId || req.body.matricule);
    if (!matricule) return res.status(404).json({ error: 'Employé introuvable' });

    const data = buildBulletinData(req.body);
    const salaireBrut = data.salaireBrut || 0;
    const totalRetenues = data.totalRetenues || 0;

    const bulletin = await prisma.bulletinPaie.create({
        data: {
            matricule,
            salaireBrut,
            salaireNet: data.salaireNet ?? Math.max(0, salaireBrut - totalRetenues),
            totalRetenues,
            primesTotal: data.primesTotal ?? 0,
            statutPaiement: data.statutPaiement || 'GENERE',
            ...data
        },
        include: { employe: true }
    });

    res.status(201).json(bulletin);
});

exports.updateBulletin = asyncHandler(async (req, res) => {
    const bulletin = await prisma.bulletinPaie.update({
        where: { id: Number(req.params.id) },
        data: buildBulletinData(req.body),
        include: { employe: true }
    });
    res.status(200).json(bulletin);
});

exports.deleteBulletin = asyncHandler(async (req, res) => {
    await prisma.bulletinPaie.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
});

exports.getPayrollOverview = asyncHandler(async (req, res) => {
    const periode = getPeriod(req.query);
    const { year, month } = splitPeriod(periode);

    const [employeesTotal, employeesActive, bulletins, sums] = await Promise.all([
        prisma.employe.count(),
        prisma.employe.count({ where: { statut: 'Actif' } }),
        prisma.bulletinPaie.findMany({ where: { periode } }),
        prisma.bulletinPaie.aggregate({
            where: { periode },
            _sum: {
                salaireBrut: true,
                salaireNet: true,
                coutTotalEmployeur: true,
                totalRetenues: true,
                cotisationCnpsSalariale: true,
                impotIs: true,
                impotCn: true,
                impotIgr: true
            }
        })
    ]);

    const paidCount = bulletins.filter((b) => ['PAYE', 'PAYÉ', 'PAID'].includes(String(b.statutPaiement || '').toUpperCase())).length;
    const validatedCount = bulletins.filter((b) => ['VALIDE', 'VALIDÉ', 'PAYE', 'PAYÉ', 'PAID'].includes(String(b.statutPaiement || '').toUpperCase())).length;
    const totalTaxes = Number(sums._sum.impotIs || 0) + Number(sums._sum.impotCn || 0) + Number(sums._sum.impotIgr || 0);

    res.status(200).json({
        period: {
            month,
            year,
            label: periode
        },
        workforce: {
            totalEmployees: employeesTotal,
            activeEmployees: employeesActive,
            coveredEmployees: bulletins.length,
            missingCnpsCount: 0,
            missingCnamCount: 0,
            supportedInitialRange: 'A-Z',
            supportedScale: 1
        },
        payroll: {
            bulletinsCount: bulletins.length,
            validatedCount,
            paidCount,
            totalGross: Number(sums._sum.salaireBrut || 0),
            totalNet: Number(sums._sum.salaireNet || 0),
            totalEmployerCost: Number(sums._sum.coutTotalEmployeur || 0),
            totalTaxes,
            totalEmployeeContributions: Number(sums._sum.cotisationCnpsSalariale || 0)
        },
        compliance: [],
        features: [],
        legalRates: [],
        declarations: []
    });
});

// Calcul de la paie pour un employé pour un mois donné
exports.calculerPaie = asyncHandler(async (req, res) => {
    const periode = getPeriod(req.body);
    const matricule = await resolveMatricule(req.body.matricule || req.body.employeId || req.body.employeeId);

    if (!matricule && req.body.grossSalary) {
        const grossSalary = Number(req.body.grossSalary || 0);
        const bonuses = Number(req.body.bonuses || 0);
        const deductions = Number(req.body.deductions || 0);
        const totalGross = grossSalary + bonuses;
        const taxes = totalGross * 0.08;
        return res.status(200).json({
            grossSalary: totalGross,
            deductions: deductions + taxes,
            netSalary: Math.max(0, totalGross - deductions - taxes),
            taxAmount: taxes
        });
    }

    if (!matricule) return res.status(404).json({ error: 'Employé introuvable' });

    const employe = await prisma.employe.findUnique({
        where: { matricule },
        include: { contrats: { where: { statutContrat: 'Actif' } } }
    });

    if (!employe || employe.contrats.length === 0) {
        return res.status(404).json({ error: "Employé introuvable ou n'a pas de contrat actif." });
    }

    const contrat = employe.contrats[0];
    const variables = await prisma.variablesMensuelle.findFirst({ where: { matricule, periode } });
    const config = await prisma.configuration.findFirst();
    const calculResult = logipaieService.calculerBulletin(employe, contrat, variables || {}, config);

    const bulletin = await prisma.bulletinPaie.create({
        data: {
            matricule,
            periode,
            ...calculResult,
            variablesMensuelleId: variables ? variables.id : null,
            statutPaiement: "GENERE",
            coutTotalEmployeur: calculResult.coutTotalEmployeur
        },
        include: { employe: true }
    });

    res.status(201).json(bulletin);
});

// Traitement de la paie en masse
exports.traitementMasse = asyncHandler(async (req, res) => {
    const periode = getPeriod(req.body);

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
        const variables = await prisma.variablesMensuelle.findFirst({
            where: { matricule: employe.matricule, periode }
        }) || {};

        const result = logipaieService.calculerBulletin(employe, contrat, variables, {});
        let totalPretsADeduire = 0;

        for (const pret of employe.prets) {
            const mensualite = Number(pret.montantTotalPrete || 0) / Math.max(1, Number(pret.nombreMoisRemboursement || 1));
            const deduction = Math.min(mensualite, Number(pret.montantRestantDu || 0));
            totalPretsADeduire += deduction;

            await prisma.pretAvance.update({
                where: { id: pret.id },
                data: {
                    montantRestantDu: { decrement: deduction },
                    nombreMoisPayes: { increment: 1 },
                    statut: (Number(pret.montantRestantDu || 0) - deduction) <= 0 ? "Terminé" : "En cours"
                }
            });
        }

        const existing = await prisma.bulletinPaie.findFirst({
            where: { matricule: employe.matricule, periode }
        });

        const payload = {
            ...result,
            salaireNet: result.salaireNet - totalPretsADeduire,
            statutPaiement: "GENERE"
        };

        const bulletin = existing
            ? await prisma.bulletinPaie.update({ where: { id: existing.id }, data: payload })
            : await prisma.bulletinPaie.create({
                data: {
                    matricule: employe.matricule,
                    periode,
                    ...payload
                }
            });

        bulletinsCrees.push(bulletin.id);
    }

    res.status(200).json({
        message: "Traitement terminé",
        count: bulletinsCrees.length,
        created: bulletinsCrees.length,
        ids: bulletinsCrees
    });
});

exports.getLivrePaieAnnuel = asyncHandler(async (req, res) => {
    const annee = req.query.annee || req.query.year || new Date().getFullYear().toString();
    const summaries = await prisma.bulletinPaie.groupBy({
        by: ['matricule'],
        where: { periode: { startsWith: String(annee) } },
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

exports.downloadBulletinPdf = asyncHandler(async (req, res) => {
    const bulletin = await prisma.bulletinPaie.findUnique({
        where: { id: Number(req.params.id) },
        include: { employe: true }
    });

    if (!bulletin) return res.status(404).json({ error: 'Bulletin introuvable' });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=bulletin_${bulletin.matricule}_${bulletin.periode}.txt`);
    res.send(`Bulletin de paie ${bulletin.periode}\nEmploye: ${bulletin.employe?.nomComplet || bulletin.matricule}\nNet a payer: ${bulletin.salaireNet || 0}`);
});
