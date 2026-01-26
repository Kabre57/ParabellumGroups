const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

/**
 * Génère un PDF de facture
 * @param {Object} facture - Les données de la facture
 * @param {string} outputPath - Le chemin de sortie du PDF
 * @returns {Promise} Promise résolue quand le PDF est généré
 */
function generateFacturePDF(facture, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // En-tête
      doc.fontSize(20).text('FACTURE', { align: 'center' });
      doc.moveDown();
      
      // Informations facture
      doc.fontSize(12);
      doc.text(`Numéro: ${facture.numeroFacture}`, { align: 'right' });
      doc.text(`Date d'émission: ${moment(facture.dateEmission).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Date d'échéance: ${moment(facture.dateEcheance).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Statut: ${facture.status}`, { align: 'right' });
      doc.moveDown(2);

      // Client
      doc.fontSize(14).text('Client:', { underline: true });
      doc.fontSize(12).text(`ID Client: ${facture.clientId}`);
      doc.moveDown(2);

      // Lignes
      doc.fontSize(14).text('Détails:', { underline: true });
      doc.moveDown();

      // Tableau des lignes
      const tableTop = doc.y;
      const descriptionX = 50;
      const quantiteX = 250;
      const prixUnitaireX = 320;
      const montantHTX = 390;
      const montantTTCX = 460;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qté', quantiteX, tableTop);
      doc.text('P.U. HT', prixUnitaireX, tableTop);
      doc.text('Mont. HT', montantHTX, tableTop);
      doc.text('Mont. TTC', montantTTCX, tableTop);
      
      doc.font('Helvetica');
      let y = tableTop + 20;

      facture.lignes.forEach(ligne => {
        doc.text(ligne.description.substring(0, 30), descriptionX, y, { width: 180 });
        doc.text(ligne.quantite.toString(), quantiteX, y);
        doc.text(`${ligne.prixUnitaire.toFixed(2)} F`, prixUnitaireX, y);
        doc.text(`${ligne.montantHT.toFixed(2)} F`, montantHTX, y);
        doc.text(`${ligne.montantTTC.toFixed(2)} F`, montantTTCX, y);
        y += 25;
      });

      // Totaux
      doc.moveDown(2);
      const totauxX = 350;
      doc.font('Helvetica-Bold');
      doc.text(`Total HT: ${facture.montantHT.toFixed(2)} F`, totauxX, y + 20);
      doc.text(`Total TVA: ${facture.montantTVA.toFixed(2)} F`, totauxX, y + 40);
      doc.fontSize(14).text(`Total TTC: ${facture.montantTTC.toFixed(2)} F`, totauxX, y + 60);

      // Notes
      if (facture.notes) {
        doc.moveDown(3);
        doc.fontSize(10).font('Helvetica');
        doc.text('Notes:', { underline: true });
        doc.text(facture.notes);
      }

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Génère un PDF de devis
 * @param {Object} devis - Les données du devis
 * @param {string} outputPath - Le chemin de sortie du PDF
 * @returns {Promise} Promise résolue quand le PDF est généré
 */
function generateDevisPDF(devis, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // En-tête
      doc.fontSize(20).text('DEVIS', { align: 'center' });
      doc.moveDown();
      
      // Informations devis
      doc.fontSize(12);
      doc.text(`Numéro: ${devis.numeroDevis}`, { align: 'right' });
      doc.text(`Date d'émission: ${moment(devis.dateEmission).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Date de validité: ${moment(devis.dateValidite).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Statut: ${devis.status}`, { align: 'right' });
      doc.moveDown(2);

      // Client
      doc.fontSize(14).text('Client:', { underline: true });
      doc.fontSize(12).text(`ID Client: ${devis.clientId}`);
      doc.moveDown(2);

      // Lignes
      doc.fontSize(14).text('Détails:', { underline: true });
      doc.moveDown();

      // Tableau des lignes
      const tableTop = doc.y;
      const descriptionX = 50;
      const quantiteX = 250;
      const prixUnitaireX = 320;
      const montantHTX = 390;
      const montantTTCX = 460;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qté', quantiteX, tableTop);
      doc.text('P.U. HT', prixUnitaireX, tableTop);
      doc.text('Mont. HT', montantHTX, tableTop);
      doc.text('Mont. TTC', montantTTCX, tableTop);
      
      doc.font('Helvetica');
      let y = tableTop + 20;

      devis.lignes.forEach(ligne => {
        doc.text(ligne.description.substring(0, 30), descriptionX, y, { width: 180 });
        doc.text(ligne.quantite.toString(), quantiteX, y);
        doc.text(`${ligne.prixUnitaire.toFixed(2)} F`, prixUnitaireX, y);
        doc.text(`${ligne.montantHT.toFixed(2)} F`, montantHTX, y);
        doc.text(`${ligne.montantTTC.toFixed(2)} F`, montantTTCX, y);
        y += 25;
      });

      // Totaux
      doc.moveDown(2);
      const totauxX = 350;
      doc.font('Helvetica-Bold');
      doc.text(`Total HT: ${devis.montantHT.toFixed(2)} F`, totauxX, y + 20);
      doc.text(`Total TVA: ${devis.montantTVA.toFixed(2)} F`, totauxX, y + 40);
      doc.fontSize(14).text(`Total TTC: ${devis.montantTTC.toFixed(2)} F`, totauxX, y + 60);

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateFacturePDF,
  generateDevisPDF
};
