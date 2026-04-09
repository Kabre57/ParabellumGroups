const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');

// Les routes RNS, DISA, ITS, etc

exports.generateDisa = asyncHandler(async (req, res, next) => {
    const { periode } = req.query; // Ex: "2024-03"
    
    // Agrégation des données bulletins pour la CNPS
    const stats = await prisma.bulletinPaie.aggregate({
        where: { periode },
        _sum: {
            salaireBrut: true,
            cotisationCnpsSalariale: true,
            cotisationCnpsPatronale: true,
            salaireBase: true
        },
        _count: { id: true }
    });

    const detail = await prisma.bulletinPaie.findMany({
        where: { periode },
        select: {
            matricule: true,
            salaireBrut: true,
            cotisationCnpsSalariale: true,
            employe: { select: { nomComplet: true, numeroCnps: true } }
        }
    });
    
    res.status(200).json({ 
        periode, 
        totalEmployes: stats._count.id,
        summary: stats._sum,
        details: detail 
    });
});

exports.generateIts = asyncHandler(async (req, res, next) => {
    const { periode } = req.query;
    
    const stats = await prisma.bulletinPaie.aggregate({
        where: { periode },
        _sum: {
            salaireBrut: true,
            impotIs: true,
            impotCn: true,
            impotIgr: true,
            totalRetenues: true
        }
    });

    const details = await prisma.bulletinPaie.findMany({
        where: { periode },
        include: { employe: { select: { nomComplet: true } } }
    });
    
    res.status(200).json({ 
        periode, 
        summary: stats._sum,
        details
    });
});

exports.printPayslip = asyncHandler(async (req, res, next) => {
    const { bulletinId } = req.params;
    
    // Génération simplifiée d'un PDF avec pdfkit 
    const bulletin = await prisma.bulletinPaie.findUnique({
        where: { id: Number(bulletinId) },
        include: { employe: true }
    });

    if (!bulletin) return res.status(404).json({ error: "Bulletin introuvable" });

    const doc = new PDFDocument();
    
    res.setHeader('Content-disposition', `attachment; filename=bulletin_${bulletin.matricule}_${bulletin.periode}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('LOGIPAIE RH - BULLETIN DE PAIE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Employé: ${bulletin.employe.nomComplet || bulletin.employe.nom}`);
    doc.text(`Matricule: ${bulletin.matricule}`);
    doc.text(`Période: ${bulletin.periode}`);
    doc.moveDown();
    doc.text(`Salaire de base: ${bulletin.salaireBase}`);
    doc.text(`Heures Supplémentaires: ${bulletin.heuresSuppMontant}`);
    doc.text(`Primes Brutes: ${bulletin.primesTotal}`);
    doc.text(`SALAIRE BRUT: ${bulletin.salaireBrut}`);
    doc.moveDown();
    doc.text(`Cotisation CNPS: ${bulletin.cotisationCnpsSalariale}`);
    doc.text(`Impôt ITS: ${bulletin.impotIs}`);
    doc.text(`Impôt CN: ${bulletin.impotCn}`);
    doc.text(`TOTAL RETENUES: ${bulletin.totalRetenues}`);
    doc.moveDown();
    doc.fontSize(14).text(`SALAIRE NET A PAYER: ${bulletin.salaireNet}`, { align: 'right' });
    
    doc.end();
});
