const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');

// Statistiques globales pour le dashboard d'accueil
exports.getGlobalStats = asyncHandler(async (req, res) => {
    const totalEmployes = await prisma.employe.count({ where: { statut: 'Actif' } });
    
    // Dernier mois de paie traité
    const lastPayroll = await prisma.bulletinPaie.findFirst({
        orderBy: { periode: 'desc' },
        select: { periode: true }
    });
    
    let totalPayroll = 0;
    if (lastPayroll) {
        const stats = await prisma.bulletinPaie.aggregate({
            where: { periode: lastPayroll.periode },
            _sum: { salaireBrut: true }
        });
        totalPayroll = stats._sum.salaireBrut || 0;
    }

    const enConge = await prisma.gestionConge.count({
        where: { statut: 'Approuvé', dateFin: { gte: new Date() } }
    });

    res.status(200).json({
        totalEmployes,
        lastPeriode: lastPayroll?.periode || 'N/A',
        totalPayroll,
        enConge
    });
});

// Indicateurs détaillés (Démographie, Départements)
exports.getIndicators = asyncHandler(async (req, res) => {
    // Répartition par Sexe
    const byGender = await prisma.employe.groupBy({
        by: ['sexe'],
        where: { statut: 'Actif' },
        _count: { id: true }
    });

    // Répartition par Département
    const byDept = await prisma.employe.groupBy({
        by: ['direction'],
        where: { statut: 'Actif' },
        _count: { id: true }
    });

    // Evolution de la masse salariale (6 derniers mois)
    const trends = await prisma.bulletinPaie.groupBy({
        by: ['periode'],
        _sum: { salaireBrut: true, salaireNet: true },
        orderBy: { periode: 'desc' },
        take: 6
    });

    res.status(200).json({
        demographics: { byGender, byDept },
        trends: trends.reverse()
    });
});
