const moment = require('moment');

/**
 * Génère un numéro de facture au format FAC-YYYYMM-NNNN
 * @param {number} sequence - Le numéro de séquence
 * @returns {string} Le numéro de facture formaté
 */
function generateFactureNumber(sequence) {
  const yearMonth = moment().format('YYYYMM');
  const paddedSequence = String(sequence).padStart(4, '0');
  return `FAC-${yearMonth}-${paddedSequence}`;
}

/**
 * Génère un numéro de devis au format DEV-YYYYMM-NNNN
 * @param {number} sequence - Le numéro de séquence
 * @returns {string} Le numéro de devis formaté
 */
function generateDevisNumber(sequence) {
  const yearMonth = moment().format('YYYYMM');
  const paddedSequence = String(sequence).padStart(4, '0');
  return `DEV-${yearMonth}-${paddedSequence}`;
}

/**
 * Extrait le mois/année d'un numéro de facture
 * @param {string} numeroFacture - Le numéro de facture
 * @returns {string|null} Le mois/année ou null
 */
function extractYearMonthFromFacture(numeroFacture) {
  const match = numeroFacture.match(/^FAC-(\d{6})-\d{4}$/);
  return match ? match[1] : null;
}

/**
 * Extrait le mois/année d'un numéro de devis
 * @param {string} numeroDevis - Le numéro de devis
 * @returns {string|null} Le mois/année ou null
 */
function extractYearMonthFromDevis(numeroDevis) {
  const match = numeroDevis.match(/^DEV-(\d{6})-\d{4}$/);
  return match ? match[1] : null;
}

module.exports = {
  generateFactureNumber,
  generateDevisNumber,
  extractYearMonthFromFacture,
  extractYearMonthFromDevis
};
