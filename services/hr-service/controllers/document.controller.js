const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');

/**
 * Génère un contrat de travail (CDI ou CDD)
 */
exports.generateContractPdf = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const contrat = await prisma.contrat.findUnique({
        where: { id: Number(id) },
        include: { employe: true }
    });

    if (!contrat) return res.status(404).json({ error: "Contrat introuvable" });

    const doc = new PDFDocument({ margin: 50 });
    const filename = `Contrat_${contrat.typeContrat}_${contrat.employe.nom}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // En-tête
    doc.fontSize(20).text('CONTRAT DE TRAVAIL', { align: 'center', underline: true });
    doc.moveDown(2);

    doc.fontSize(12).text('ENTRE LES SOUSSIGNÉS :', { underline: true });
    doc.moveDown();
    doc.text(`La Société LOGIPAIE SA, dont le siège est à Abidjan, représentée par Monsieur l'Administrateur Général, ci-après dénommée "L'EMPLOYEUR"`, { align: 'justify' });
    doc.moveDown();
    doc.text('D’UNE PART,', { align: 'center' });
    doc.moveDown();
    doc.text(`Et Monsieur/Madame ${contrat.employe.nomComplet || contrat.employe.nom}, né(e) le ${contrat.employe.dateNaissance ? contrat.employe.dateNaissance.toLocaleDateString() : 'NC'}, de nationalité ${contrat.employe.nationalite || 'NC'}, résidant à ${contrat.employe.adressePersonnelle || 'NC'}, ci-après dénommé(e) "L’EMPLOYÉ(E)"`, { align: 'justify' });
    doc.moveDown();
    doc.text('D’AUTRE PART,', { align: 'center' });
    doc.moveDown(2);

    doc.text(`Il a été convenu ce qui suit :`, { underline: true });
    doc.moveDown();
    doc.text(`ARTICLE 1 : NATURE DU CONTRAT ET FONCTIONS`, { font: 'Helvetica-Bold' });
    doc.text(`L’Employé est engagé par l’Employeur en qualité de ${contrat.posteOccupe || 'Agent'} sous le régime d'un Contrat à Durée ${contrat.typeContrat === 'CDD' ? 'Déterminée' : 'Indéterminée'}.`, { align: 'justify' });
    doc.moveDown();
    
    doc.text(`ARTICLE 2 : DATE D'EFFET`, { font: 'Helvetica-Bold' });
    doc.text(`Le présent contrat prend effet à compter du ${contrat.dateDebut ? contrat.dateDebut.toLocaleDateString() : 'la date de signature'}.`, { align: 'justify' });
    doc.moveDown();

    doc.text(`ARTICLE 3 : RÉMUNÉRATION`, { font: 'Helvetica-Bold' });
    doc.text(`En contrepartie de ses services, l’Employé percevra un salaire de base mensuel brut de ${contrat.salaireBaseMensuel || 0} FCFA.`, { align: 'justify' });
    doc.moveDown(3);

    doc.text('Fait à Abidjan, le ' + new Date().toLocaleDateString(), { align: 'right' });
    doc.moveDown(2);
    
    doc.text('L\'Employeur', 50, doc.y, { width: 200, align: 'left' });
    doc.text('L\'Employé(e)', 350, doc.y, { width: 200, align: 'right' });

    doc.end();
});

/**
 * Génère une attestation de travail
 */
exports.generateAttestationPdf = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const employe = await prisma.employe.findUnique({
        where: { id },
        include: { contrats: { orderBy: { dateDebut: 'asc' } } }
    });

    if (!employe) return res.status(404).json({ error: "Employé introuvable" });

    const doc = new PDFDocument({ margin: 70 });
    res.setHeader('Content-disposition', `attachment; filename=Attestation_${employe.nom}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(22).text('ATTESTATION DE TRAVAIL', { align: 'center', underline: true });
    doc.moveDown(3);

    doc.fontSize(14).text(`Je soussigné, le Responsable des Ressources Humaines de la société LOGIPAIE SA, atteste par la présente que :`, { align: 'justify' });
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').text(`${employe.civilite || ''} ${employe.nomComplet || employe.nom}`, { align: 'center' });
    doc.moveDown();

    const dateEntree = employe.contrats.length > 0 ? employe.contrats[0].dateDebut.toLocaleDateString() : 'NC';
    
    doc.fontSize(14).font('Helvetica').text(`Est employé(e) au sein de notre établissement depuis le ${dateEntree} en qualité de ${employe.contrats[0]?.posteOccupe || 'Collaborateur'}.`, { align: 'justify' });
    doc.moveDown(2);
    doc.text(`La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.`, { align: 'justify' });
    doc.moveDown(4);

    doc.text('Fait à Abidjan, le ' + new Date().toLocaleDateString(), { align: 'right' });
    doc.moveDown(2);
    doc.text('La Direction', { align: 'right' });

    doc.end();
});
