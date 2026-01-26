/**
 * Calcule les montants HT, TVA et TTC à partir de la quantité, prix unitaire et taux de TVA
 * @param {number} quantite - La quantité
 * @param {number} prixUnitaire - Le prix unitaire HT
 * @param {number} tauxTVA - Le taux de TVA en pourcentage (ex: 20 pour 20%)
 * @returns {Object} Objet contenant montantHT, montantTVA, montantTTC
 */
function calculateMontants(quantite, prixUnitaire, tauxTVA) {
  const montantHT = parseFloat((quantite * prixUnitaire).toFixed(2));
  const montantTVA = parseFloat((montantHT * tauxTVA / 100).toFixed(2));
  const montantTTC = parseFloat((montantHT + montantTVA).toFixed(2));

  return {
    montantHT,
    montantTVA,
    montantTTC
  };
}

/**
 * Calcule le total d'une liste de lignes
 * @param {Array} lignes - Tableau de lignes avec montantHT, montantTVA, montantTTC
 * @returns {Object} Objet contenant totalHT, totalTVA, totalTTC
 */
function calculateTotal(lignes) {
  const totalHT = lignes.reduce((sum, ligne) => sum + ligne.montantHT, 0);
  const totalTVA = lignes.reduce((sum, ligne) => sum + ligne.montantTVA, 0);
  const totalTTC = lignes.reduce((sum, ligne) => sum + ligne.montantTTC, 0);

  return {
    totalHT: parseFloat(totalHT.toFixed(2)),
    totalTVA: parseFloat(totalTVA.toFixed(2)),
    totalTTC: parseFloat(totalTTC.toFixed(2))
  };
}

/**
 * Valide un taux de TVA
 * @param {number} tauxTVA - Le taux de TVA
 * @returns {boolean} True si le taux est valide
 */
function isValidTauxTVA(tauxTVA) {
  const tauxValides = [0, 2.1, 5.5, 10, 20];
  return tauxValides.includes(parseFloat(tauxTVA));
}

module.exports = {
  calculateMontants,
  calculateTotal,
  isValidTauxTVA
};
