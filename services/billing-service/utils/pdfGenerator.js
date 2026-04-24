const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const axios = require('axios');

async function fetchBuffer(url) {
  const resp = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data);
}

function normalizePdfLine(ligne = {}) {
  const quantity = Number(ligne.quantite ?? ligne.quantity ?? 0) || 0;
  const unitPrice = Number(ligne.prixUnitaire ?? ligne.unitPrice ?? 0) || 0;
  const vatRate = Number(ligne.tauxTVA ?? ligne.vatRate ?? ligne.tva ?? 0) || 0;
  const amountHT = Number(ligne.montantHT ?? ligne.totalHT ?? quantity * unitPrice) || 0;
  const amountTTC =
    Number(ligne.montantTTC ?? ligne.totalTTC ?? ligne.total ?? amountHT * (1 + vatRate / 100)) || 0;
  return {
    description: String(ligne.description || ligne.designation || '-'),
    imageUrl: ligne.imageUrl || ligne.image || ligne.image_url || null,
    quantity,
    unitPrice,
    vatRate,
    amountHT,
    amountTTC,
  };
}

function ensureDirectory(filePath) {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

/**
 * Génère un PDF de facture
 * @param {Object} facture - Les données de la facture
 * @param {string} outputPath - Le chemin de sortie du PDF
 * @returns {Promise} Promise résolue quand le PDF est généré
 */
function generateFacturePDF(facture, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      ensureDirectory(outputPath);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // Logo du document
      (async () => {
        if (facture.serviceLogoUrl) {
          try {
            const logoBuffer = await fetchBuffer(facture.serviceLogoUrl);
            const tempPath = path.join(__dirname, '..', 'temp', `logo-${facture.id}.png`);
            fs.writeFileSync(tempPath, logoBuffer);
            doc.image(tempPath, 50, 40, { fit: [120, 60] });
            fs.unlinkSync(tempPath);
          } catch (e) {
            console.warn('Logo facture non chargé', e.message);
          }
        }
      })();

      // En-tête
      doc.fontSize(20).text('FACTURE', { align: 'center' });
      doc.moveDown();
      
      // Informations facture
      doc.fontSize(12);
      doc.text(`Numéro: ${facture.numeroFacture}`, { align: 'right' });
      doc.text(`Date d'émission: ${moment(facture.dateEmission).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Date d'échéance: ${moment(facture.dateEcheance).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Statut: ${facture.status}`, { align: 'right' });
      if (facture.enterpriseName) {
        doc.text(`Entreprise émettrice: ${facture.enterpriseName}`, { align: 'right' });
      } else if (facture.serviceName) {
        doc.text(`Entreprise émettrice: ${facture.serviceName}`, { align: 'right' });
      }
      doc.moveDown(2);

      // Client
      doc.fontSize(14).text('Client:', { underline: true });
      doc.fontSize(12).text(facture.client?.nom || facture.clientName || facture.clientId || '-');
      if (facture.client?.email) {
        doc.text(facture.client.email);
      }
      doc.moveDown(2);

      // Lignes
      doc.fontSize(14).text('Détails:', { underline: true });
      doc.moveDown();

      // Tableau des lignes
      const tableTop = doc.y;
      const imageX = 50;
      const descriptionX = 100;
      const quantiteX = 270;
      const prixUnitaireX = 330;
      const montantHTX = 400;
      const montantTTCX = 470;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Image', imageX, tableTop);
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qté', quantiteX, tableTop);
      doc.text('P.U. HT', prixUnitaireX, tableTop);
      doc.text('Mont. HT', montantHTX, tableTop);
      doc.text('Mont. TTC', montantTTCX, tableTop);
      
      doc.font('Helvetica');
      let y = tableTop + 20;

      const lignes = (facture.lignes || []).map(normalizePdfLine);
      const drawLines = async () => {
        for (const ligne of lignes) {
          if (ligne.imageUrl) {
            try {
              const buffer = await fetchBuffer(ligne.imageUrl);
              doc.image(buffer, imageX, y - 2, { fit: [36, 36] });
            } catch (e) {
              console.warn('Image ligne facture non chargée', e.message);
            }
          }
          doc.text(ligne.description.substring(0, 30), descriptionX, y, { width: 160 });
          doc.text(String(ligne.quantity), quantiteX, y);
          doc.text(`${ligne.unitPrice.toFixed(2)} F`, prixUnitaireX, y);
          doc.text(`${ligne.amountHT.toFixed(2)} F`, montantHTX, y);
          doc.text(`${ligne.amountTTC.toFixed(2)} F`, montantTTCX, y);
          y += 25;
        }
      };

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

      (async () => {
        await drawLines();
        doc.end();
      })();

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
      ensureDirectory(outputPath);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // Logo du document
      (async () => {
        if (devis.serviceLogoUrl) {
          try {
            const logoBuffer = await fetchBuffer(devis.serviceLogoUrl);
            const tempPath = path.join(__dirname, '..', 'temp', `logo-${devis.id}.png`);
            fs.writeFileSync(tempPath, logoBuffer);
            doc.image(tempPath, 50, 40, { fit: [120, 60] });
            fs.unlinkSync(tempPath);
          } catch (e) {
            console.warn('Logo devis non chargé', e.message);
          }
        }
      })();

      // En-tête
      doc.fontSize(20).text('DEVIS', { align: 'center' });
      doc.moveDown();
      
      // Informations devis
      doc.fontSize(12);
      doc.text(`Numéro: ${devis.numeroDevis}`, { align: 'right' });
      doc.text(`Date d'émission: ${moment(devis.dateEmission).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Date de validité: ${moment(devis.dateValidite).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Statut: ${devis.status}`, { align: 'right' });
      if (devis.enterpriseName) {
        doc.text(`Entreprise émettrice: ${devis.enterpriseName}`, { align: 'right' });
      } else if (devis.serviceName) {
        doc.text(`Entreprise émettrice: ${devis.serviceName}`, { align: 'right' });
      }
      doc.moveDown(2);

      // Client
      doc.fontSize(14).text('Client:', { underline: true });
      doc.fontSize(12).text(devis.client?.nom || devis.clientName || devis.clientId || '-');
      if (devis.client?.email) {
        doc.text(devis.client.email);
      }
      doc.moveDown(2);

      // Lignes
      doc.fontSize(14).text('Détails:', { underline: true });
      doc.moveDown();

      // Tableau des lignes
      const tableTop = doc.y;
      const imageX = 50;
      const descriptionX = 100;
      const quantiteX = 270;
      const prixUnitaireX = 330;
      const montantHTX = 400;
      const montantTTCX = 470;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Image', imageX, tableTop);
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qté', quantiteX, tableTop);
      doc.text('P.U. HT', prixUnitaireX, tableTop);
      doc.text('Mont. HT', montantHTX, tableTop);
      doc.text('Mont. TTC', montantTTCX, tableTop);
      
      doc.font('Helvetica');
      let y = tableTop + 20;

      const lignes = (devis.lignes || []).map(normalizePdfLine);
      const drawLines = async () => {
        for (const ligne of lignes) {
          if (ligne.imageUrl) {
            try {
              const buffer = await fetchBuffer(ligne.imageUrl);
              doc.image(buffer, imageX, y - 2, { fit: [36, 36] });
            } catch (e) {
              console.warn('Image ligne devis non chargée', e.message);
            }
          }
          doc.text(ligne.description.substring(0, 30), descriptionX, y, { width: 160 });
          doc.text(String(ligne.quantity), quantiteX, y);
          doc.text(`${ligne.unitPrice.toFixed(2)} F`, prixUnitaireX, y);
          doc.text(`${ligne.amountHT.toFixed(2)} F`, montantHTX, y);
          doc.text(`${ligne.amountTTC.toFixed(2)} F`, montantTTCX, y);
          y += 25;
        }
      };

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

function generateAvoirPDF(avoir, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      ensureDirectory(outputPath);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      (async () => {
        if (avoir.serviceLogoUrl) {
          try {
            const logoBuffer = await fetchBuffer(avoir.serviceLogoUrl);
            const tempPath = path.join(__dirname, '..', 'temp', `logo-avoir-${avoir.id}.png`);
            fs.writeFileSync(tempPath, logoBuffer);
            doc.image(tempPath, 50, 40, { fit: [120, 60] });
            fs.unlinkSync(tempPath);
          } catch (e) {
            console.warn('Logo avoir non chargé', e.message);
          }
        }
      })();

      doc.fontSize(20).text('AVOIR / NOTE DE CREDIT', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Numéro: ${avoir.numeroAvoir}`, { align: 'right' });
      doc.text(`Facture d'origine: ${avoir.factureNumero}`, { align: 'right' });
      doc.text(`Date d'émission: ${moment(avoir.createdAt).format('DD/MM/YYYY')}`, { align: 'right' });
      doc.text(`Statut: ${avoir.status}`, { align: 'right' });
      doc.moveDown(2);

      doc.fontSize(14).text('Client:', { underline: true });
      doc.fontSize(12).text(avoir.client?.nom || avoir.clientName || avoir.clientId || '-');
      doc.moveDown();
      doc.text(`Motif: ${avoir.motif}`);
      if (avoir.notes) {
        doc.moveDown(0.5);
        doc.text(`Notes: ${avoir.notes}`);
      }
      doc.moveDown(2);

      doc.fontSize(14).text('Détails:', { underline: true });
      doc.moveDown();

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

      (avoir.lignes || []).forEach((ligne) => {
        doc.text(String(ligne.description || '').substring(0, 30), descriptionX, y, { width: 180 });
        doc.text(String(ligne.quantite || 0), quantiteX, y);
        doc.text(`${Number(ligne.prixUnitaire || 0).toFixed(2)} F`, prixUnitaireX, y);
        doc.text(`${Number(ligne.montantHT || 0).toFixed(2)} F`, montantHTX, y);
        doc.text(`${Number(ligne.montantTTC || 0).toFixed(2)} F`, montantTTCX, y);
        y += 25;
      });

      const totauxX = 350;
      doc.font('Helvetica-Bold');
      doc.text(`Total HT: ${Number(avoir.montantHT || 0).toFixed(2)} F`, totauxX, y + 20);
      doc.text(`Total TVA: ${Number(avoir.montantTVA || 0).toFixed(2)} F`, totauxX, y + 40);
      doc.fontSize(14).text(`Total TTC: ${Number(avoir.montantTTC || 0).toFixed(2)} F`, totauxX, y + 60);

      (async () => {
        await drawLines();
        doc.end();
      })();
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateFacturePDF,
  generateDevisPDF,
  generateAvoirPDF
};
