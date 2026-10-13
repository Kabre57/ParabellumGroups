// Dependances et payloads communs aux commandes d'achat.
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { generateBonCommandeNumber } = require('../../utils/purchaseNumberGenerator');
const { serializeOrder, fetchServiceMeta } = require('../../utils/purchaseQuoteHelpers');
const { enqueueProcurementEvent } = require('../../utils/outbox');

const prisma = new PrismaClient();

const getCorrelationId = (req) => req.headers['x-correlation-id'] || null;
const withEnterpriseContext = (req, payload = {}) => ({
  ...payload,
  enterpriseId: req.user?.enterpriseId ? Number(req.user.enterpriseId) : null,
  enterpriseName: req.user?.enterpriseName || null,
});

const purchaseOrderCreatedPayload = (order) => ({
  purchaseOrderId: order.id,
  purchaseOrderNumber: order.numeroBon,
  sourcePurchaseQuoteId: order.sourceDevisAchatId || null,
  sourcePurchaseQuoteNumber: order.requestNumber || null,
  serviceId: order.serviceId || null,
  serviceName: order.serviceName || null,
  supplierId: order.supplierId || null,
  supplierName: order.fournisseurNom || order.supplier || null,
  amountHT: order.montantHT || 0,
  amountTVA: order.montantTVA || 0,
  amountTTC: order.montantTotal || order.amount || 0,
  currency: 'XOF',
  status: order.status,
  createdAt: order.createdAt,
});

const purchaseOrderStatusChangedPayload = (order, fromStatus) => ({
  purchaseOrderId: order.id,
  purchaseOrderNumber: order.numeroBon,
  fromStatus,
  toStatus: order.status,
  serviceId: order.serviceId || null,
  serviceName: order.serviceName || null,
  amountTTC: order.montantTotal || order.amount || 0,
});

const buildLignePayload = (ligne) => {
  const quantite = parseInt(ligne.quantite, 10) || 0;
  const prixUnitaire = parseFloat(ligne.prixUnitaire) || 0;
  const tva = parseFloat(ligne.tva ?? 0) || 0;
  const montantHT = quantite * prixUnitaire;
  const montantTTC = montantHT * (1 + tva / 100);

  return {
    articleId: ligne.articleId ? String(ligne.articleId) : null,
    referenceArticle: ligne.referenceArticle || ligne.reference || null,
    designation: ligne.designation,
    categorie: ligne.categorie || ligne.category || null,
    unite: String(ligne.unite || ligne.unit || '').trim() || null,
    quantite,
    prixUnitaire,
    tva,
    montantHT,
    montantTTC,
    montant: montantTTC, // compatibilité
  };
};

// Get all bons commande with pagination and filters

module.exports = { prisma, validationResult, generateBonCommandeNumber, serializeOrder, fetchServiceMeta, enqueueProcurementEvent, getCorrelationId, withEnterpriseContext, purchaseOrderCreatedPayload, purchaseOrderStatusChangedPayload, buildLignePayload };
