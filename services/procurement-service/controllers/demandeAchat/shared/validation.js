// Validations metier avant soumission d une demande ou proforma.
const validateRequestForSubmission = (demande) => {
  if (!demande.fournisseurId && !String(demande.fournisseurNomLibre || '').trim()) {
    return 'Le fournisseur est obligatoire avant la soumission au PDG';
  }

  if (!Array.isArray(demande.lignes) || demande.lignes.length === 0) {
    return 'Au moins une ligne article est requise avant soumission';
  }

  if (demande.lignes.some((ligne) => Number(ligne.prixUnitaire || 0) <= 0)) {
    return 'Chaque ligne de la DPA doit comporter un prix fournisseur strictement positif';
  }

  return null;
};

const validateProformaReadiness = (proforma) => {
  if (!proforma.fournisseurId) {
    return 'Le fournisseur de la proforma est obligatoire';
  }

  if (!Array.isArray(proforma.lignes) || proforma.lignes.length === 0) {
    return 'Une proforma doit contenir au moins une ligne';
  }

  if (proforma.lignes.some((ligne) => Number(ligne.prixUnitaire || 0) <= 0)) {
    return 'Chaque ligne de la proforma doit comporter un prix strictement positif';
  }

  return null;
};

module.exports = { validateRequestForSubmission, validateProformaReadiness };
