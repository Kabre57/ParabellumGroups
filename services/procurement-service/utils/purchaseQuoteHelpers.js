const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundCurrency = (value) => Math.round((normalizeNumber(value) + Number.EPSILON) * 100) / 100;

const buildQuoteLine = (ligne = {}) => {
  const designation = String(ligne.designation || ligne.nom || ligne.label || '').trim();
  const quantite = Math.max(1, Math.trunc(normalizeNumber(ligne.quantite ?? ligne.quantity ?? ligne.qty, 1)));
  const prixUnitaire = Math.max(0, normalizeNumber(ligne.prixUnitaire ?? ligne.unitPrice ?? ligne.unit_price, 0));
  const tva = Math.min(100, Math.max(0, normalizeNumber(ligne.tva ?? ligne.tauxTVA ?? ligne.vatRate, 0)));
  const montantHT = roundCurrency(quantite * prixUnitaire);
  const montantTTC = roundCurrency(montantHT * (1 + tva / 100));

  return {
    articleId: ligne.articleId ? String(ligne.articleId) : null,
    referenceArticle: ligne.referenceArticle || ligne.reference || null,
    designation,
    categorie: ligne.categorie || ligne.category || null,
    quantite,
    prixUnitaire,
    tva,
    montantHT,
    montantTTC,
  };
};

const normalizeQuoteLines = (lignes = []) =>
  Array.isArray(lignes)
    ? lignes.map(buildQuoteLine).filter((ligne) => ligne.designation && ligne.quantite > 0)
    : [];

const normalizeProformaLines = normalizeQuoteLines;

const calculateTotals = (lignes = []) => {
  const montantHT = roundCurrency(lignes.reduce((sum, ligne) => sum + normalizeNumber(ligne.montantHT), 0));
  const montantTTC = roundCurrency(lignes.reduce((sum, ligne) => sum + normalizeNumber(ligne.montantTTC), 0));
  const montantTVA = roundCurrency(montantTTC - montantHT);

  return {
    montantHT,
    montantTVA,
    montantTTC,
  };
};

const fetchServiceMeta = async (req, serviceId, fallbackName = null) => {
  if (!serviceId) {
    return { serviceName: fallbackName || null };
  }

  try {
    const authBase = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
    const resp = await fetch(`${authBase}/api/services/${serviceId}`, {
      headers: {
        authorization: req.headers.authorization || '',
      },
    });

    if (!resp.ok) {
      throw new Error(`Service lookup failed with status ${resp.status}`);
    }

    const payload = await resp.json();
    return {
      serviceName: payload?.data?.name || fallbackName || null,
    };
  } catch (error) {
    console.warn('Service meta lookup failed:', error.message);
    return {
      serviceName: fallbackName || null,
    };
  }
};

const serializeProforma = (proforma = {}) => ({
  id: proforma.id,
  numeroProforma: proforma.numeroProforma,
  title: proforma.titre || proforma.numeroProforma,
  titre: proforma.titre || null,
  demandeAchatId: proforma.demandeAchatId,
  fournisseurId: proforma.fournisseurId,
  fournisseurNom: proforma.fournisseur?.nom || null,
  devise: proforma.devise || 'XOF',
  montantHT: Number(proforma.montantHT ?? 0),
  montantTVA: Number(proforma.montantTVA ?? 0),
  montantTTC: Number(proforma.montantTTC ?? 0),
  status: proforma.status || 'BROUILLON',
  notes: proforma.notes || null,
  submittedAt: proforma.submittedAt || null,
  approvedAt: proforma.approvedAt || null,
  approvedByUserId: proforma.approvedByUserId || null,
  approvedByServiceId: proforma.approvedByServiceId ?? null,
  approvedByServiceName: proforma.approvedByServiceName || null,
  rejectionReason: proforma.rejectionReason || null,
  selectedForOrder: Boolean(proforma.selectedForOrder),
  bonCommandeId: proforma.bonCommande?.id || null,
  numeroBon: proforma.bonCommande?.numeroBon || null,
  createdAt: proforma.createdAt,
  updatedAt: proforma.updatedAt,
  lignes: Array.isArray(proforma.lignes)
    ? proforma.lignes.map((ligne) => ({
        id: ligne.id,
        articleId: ligne.articleId || null,
        referenceArticle: ligne.referenceArticle || null,
        designation: ligne.designation,
        categorie: ligne.categorie || null,
        quantite: ligne.quantite,
        prixUnitaire: Number(ligne.prixUnitaire ?? 0),
        tva: Number(ligne.tva ?? 0),
        montantHT: Number(ligne.montantHT ?? 0),
        montantTTC: Number(ligne.montantTTC ?? 0),
      }))
    : [],
  approvalHistory: Array.isArray(proforma.approvalLogs)
    ? proforma.approvalLogs.map((log) => ({
        id: log.id,
        action: log.action,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actorUserId: log.actorUserId || null,
        actorEmail: log.actorEmail || null,
        actorServiceId: log.actorServiceId ?? null,
        actorServiceName: log.actorServiceName || null,
        commentaire: log.commentaire || null,
        createdAt: log.createdAt,
      }))
    : [],
});

const serializeQuote = (demande = {}) => {
  const bonCommande = Array.isArray(demande.bonsCommande) ? demande.bonsCommande[0] : demande.bonsCommande || null;
  const proformas = Array.isArray(demande.proformas) ? demande.proformas.map(serializeProforma) : [];
  const selectedProforma = proformas.find((proforma) => proforma.selectedForOrder) || null;

  return {
    id: demande.id,
    numeroDemande: demande.numeroDemande,
    numeroDevisAchat: demande.numeroDemande,
    titre: demande.titre,
    objet: demande.objet || demande.titre,
    description: demande.description,
    demandeurId: demande.demandeurId,
    demandeurUserId: demande.demandeurId,
    demandeurEmail: demande.demandeurEmail || null,
    serviceId: demande.serviceId ?? null,
    serviceName: demande.serviceName || null,
    fournisseurId: demande.fournisseurId || null,
    fournisseurNom: demande.fournisseurNom || demande.fournisseur?.nom || null,
    devise: demande.devise || 'XOF',
    dateDemande: demande.dateDemande,
    dateBesoin: demande.dateBesoin,
    montantEstime: Number(demande.montantEstime ?? demande.montantTTC ?? 0),
    montantHT: Number(demande.montantHT ?? 0),
    montantTVA: Number(demande.montantTVA ?? 0),
    montantTTC: Number(demande.montantTTC ?? 0),
    status: demande.status,
    approvalStatus:
      demande.status === 'SOUMISE'
        ? 'EN_ATTENTE_VALIDATION'
        : demande.status === 'APPROUVEE'
        ? 'VALIDEE'
        : demande.status === 'PROFORMA_SOUMISE'
        ? 'PROFORMA_EN_ATTENTE_VALIDATION'
        : demande.status === 'PROFORMA_APPROUVEE'
        ? 'PROFORMA_VALIDEE'
        : demande.status,
    notes: demande.notes || null,
    submittedAt: demande.submittedAt,
    approvedAt: demande.approvedAt,
    approvedByUserId: demande.approvedByUserId || null,
    approvedByServiceId: demande.approvedByServiceId ?? null,
    approvedByServiceName: demande.approvedByServiceName || null,
    rejectionReason: demande.rejectionReason || null,
    bonCommandeId: bonCommande?.id || null,
    numeroBon: bonCommande?.numeroBon || null,
    selectedProformaId: selectedProforma?.id || null,
    selectedProformaNumber: selectedProforma?.numeroProforma || null,
    createdAt: demande.createdAt,
    updatedAt: demande.updatedAt,
    fournisseur: demande.fournisseur
      ? {
          id: demande.fournisseur.id,
          nom: demande.fournisseur.nom,
          email: demande.fournisseur.email,
          telephone: demande.fournisseur.telephone || null,
        }
      : null,
    lignes: Array.isArray(demande.lignes)
      ? demande.lignes.map((ligne) => ({
          id: ligne.id,
          articleId: ligne.articleId || null,
          referenceArticle: ligne.referenceArticle || null,
          designation: ligne.designation,
          categorie: ligne.categorie || null,
          quantite: ligne.quantite,
          prixUnitaire: Number(ligne.prixUnitaire ?? 0),
          tva: Number(ligne.tva ?? 0),
          montantHT: Number(ligne.montantHT ?? 0),
          montantTTC: Number(ligne.montantTTC ?? 0),
        }))
      : [],
    approvalHistory: Array.isArray(demande.approvalLogs)
      ? demande.approvalLogs.map((log) => ({
          id: log.id,
          action: log.action,
          fromStatus: log.fromStatus,
          toStatus: log.toStatus,
          actorUserId: log.actorUserId || null,
          actorEmail: log.actorEmail || null,
          actorServiceId: log.actorServiceId ?? null,
          actorServiceName: log.actorServiceName || null,
          commentaire: log.commentaire || null,
          createdAt: log.createdAt,
        }))
      : [],
    proformas,
  };
};

const serializeOrder = (bon = {}) => ({
  id: bon.id,
  number: bon.numeroBon,
  numeroBon: bon.numeroBon,
  sourceDevisAchatId: bon.demandeAchatId || null,
  requestId: bon.demandeAchatId || null,
  requestNumber: bon.demandeAchat?.numeroDemande || null,
  proformaId: bon.proformaId || null,
  proformaNumber: bon.proforma?.numeroProforma || null,
  serviceId: bon.serviceId ?? null,
  serviceName: bon.serviceName || null,
  supplierId: bon.fournisseurId,
  supplier: bon.fournisseur?.nom || null,
  fournisseurNom: bon.fournisseur?.nom || null,
  amount: Number(bon.montantTotal ?? 0),
  montantHT: Number(bon.montantHT ?? 0),
  montantTVA: Number(bon.montantTVA ?? 0),
  montantTotal: Number(bon.montantTotal ?? 0),
  status: bon.status,
  date: bon.dateCommande,
  dateCommande: bon.dateCommande,
  deliveryDate: bon.dateLivraison,
  dateLivraison: bon.dateLivraison,
  items: Array.isArray(bon.lignes) ? bon.lignes.length : 0,
  itemsDetail: Array.isArray(bon.lignes)
    ? bon.lignes.map((ligne) => ({
        id: ligne.id,
        articleId: ligne.articleId || null,
        referenceArticle: ligne.referenceArticle || null,
        designation: ligne.designation,
        categorie: ligne.categorie || null,
        quantity: ligne.quantite,
        quantite: ligne.quantite,
        unitPrice: Number(ligne.prixUnitaire ?? 0),
        prixUnitaire: Number(ligne.prixUnitaire ?? 0),
        tva: Number(ligne.tva ?? 0),
        amountHT: Number(ligne.montantHT ?? 0),
        amount: Number(ligne.montantTTC ?? 0),
        montantTTC: Number(ligne.montantTTC ?? 0),
      }))
    : [],
  createdAt: bon.createdAt,
  updatedAt: bon.updatedAt,
});

module.exports = {
  normalizeNumber,
  buildQuoteLine,
  normalizeQuoteLines,
  normalizeProformaLines,
  calculateTotals,
  fetchServiceMeta,
  serializeProforma,
  serializeQuote,
  serializeOrder,
};
