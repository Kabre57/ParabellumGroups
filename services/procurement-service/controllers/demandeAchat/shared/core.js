// Primitives Prisma, formatage des offres et evenements achats.
const { PrismaClient } = require('@prisma/client');
const {
  generateDemandeAchatNumber,
  generateBonCommandeNumber,
  generateProformaNumber,
} = require('../../../utils/purchaseNumberGenerator');
const {
  normalizeQuoteLines,
  normalizeProformaLines,
  calculateTotals,
  fetchServiceMeta,
  serializeQuote,
  serializeOrder,
  serializeProforma,
} = require('../../../utils/purchaseQuoteHelpers');
const { enqueueProcurementEvent } = require('../../../utils/outbox');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../../../utils/enterpriseScope');

const prisma = new PrismaClient();

const withEnterpriseContext = (payload = {}, entity = null) => ({
  ...payload,
  enterpriseId: entity?.enterpriseId ?? payload.enterpriseId ?? null,
  enterpriseName: entity?.enterpriseName || payload.enterpriseName || null,
});

const proformaInclude = {
  fournisseur: true,
  lignes: {
    orderBy: { createdAt: 'asc' },
  },
  approvalLogs: {
    orderBy: { createdAt: 'desc' },
  },
  bonCommande: {
    select: {
      id: true,
      numeroBon: true,
      status: true,
    },
  },
};

const quoteInclude = {
  fournisseur: true,
  lignes: {
    orderBy: { createdAt: 'asc' },
  },
  approvalLogs: {
    orderBy: { createdAt: 'desc' },
  },
  proformas: {
    orderBy: { createdAt: 'desc' },
    include: proformaInclude,
  },
  bonsCommande: {
    orderBy: { createdAt: 'desc' },
    include: {
      fournisseur: true,
      proforma: {
        select: {
          id: true,
          numeroProforma: true,
        },
      },
      lignes: {
        orderBy: { createdAt: 'asc' },
      },
      demandeAchat: {
        select: {
          id: true,
          numeroDemande: true,
          titre: true,
        },
      },
    },
  },
};

const buildQuoteSnapshotPayload = (quote) => ({
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  enterpriseId: quote.enterpriseId ?? null,
  enterpriseName: quote.enterpriseName || null,
  serviceId: quote.serviceId,
  serviceName: quote.serviceName,
  requesterUserId: quote.demandeurUserId,
  supplierId: quote.selectedProformaId
    ? quote.proformas?.find((proforma) => proforma.id === quote.selectedProformaId)?.fournisseurId || quote.fournisseurId
    : quote.fournisseurId,
  supplierName: quote.selectedProformaId
    ? quote.proformas?.find((proforma) => proforma.id === quote.selectedProformaId)?.fournisseurNom || quote.fournisseurNom
    : quote.fournisseurNom,
  amountHT: quote.montantHT,
  amountTVA: quote.montantTVA,
  amountTTC: quote.montantTTC,
  currency: quote.devise || 'XOF',
  status: quote.status,
  selectedProformaId: quote.selectedProformaId || null,
  selectedProformaNumber: quote.selectedProformaNumber || null,
});

const purchaseQuoteCreatedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  createdAt: quote.createdAt,
});

const purchaseQuoteSubmittedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  submittedAt: quote.submittedAt,
});

const purchaseQuoteRejectedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  reason: quote.rejectionReason || null,
});

const purchaseQuoteApprovedPayload = (quote) => ({
  ...buildQuoteSnapshotPayload(quote),
  approvedByUserId: quote.approvedByUserId,
  approvedByServiceId: quote.approvedByServiceId,
  approvedByServiceName: quote.approvedByServiceName,
});

const proformaCreatedPayload = (quote, proforma) => ({
  enterpriseId: quote.enterpriseId ?? null,
  enterpriseName: quote.enterpriseName || null,
  serviceId: quote.serviceId ?? null,
  serviceName: quote.serviceName || null,
  purchaseQuoteId: quote.id,
  purchaseQuoteNumber: quote.numeroDevisAchat,
  proformaId: proforma.id,
  proformaNumber: proforma.numeroProforma,
  supplierId: proforma.fournisseurId,
  supplierName: proforma.fournisseurNom,
  amountHT: proforma.montantHT,
  amountTVA: proforma.montantTVA,
  amountTTC: proforma.montantTTC,
  currency: proforma.devise || quote.devise || 'XOF',
  quoteStatus: quote.status,
  selectedForOrder: Boolean(proforma.selectedForOrder),
  status: proforma.status,
});

const proformaSubmittedPayload = (quote, proforma) => ({
  ...proformaCreatedPayload(quote, proforma),
  submittedAt: proforma.submittedAt,
});

const proformaApprovedPayload = (quote, proforma) => ({
  ...proformaCreatedPayload(quote, proforma),
});

const proformaRejectedPayload = (quote, proforma) => ({
  ...proformaCreatedPayload(quote, proforma),
  reason: proforma.rejectionReason || null,
});

const purchaseOrderCreatedPayload = (order) => ({
  purchaseOrderId: order.id,
  purchaseOrderNumber: order.numeroBon,
  sourcePurchaseQuoteId: order.sourceDevisAchatId,
  sourcePurchaseQuoteNumber: order.requestNumber,
  sourceProformaId: order.proformaId,
  sourceProformaNumber: order.proformaNumber,
  serviceId: order.serviceId,
  serviceName: order.serviceName,
  supplierId: order.supplierId,
  supplierName: order.fournisseurNom || order.supplier,
  amountHT: order.montantHT || 0,
  amountTVA: order.montantTVA || 0,
  amountTTC: order.montantTotal || order.amount,
  currency: 'XOF',
  status: order.status,
  createdAt: order.createdAt,
});

module.exports = {
  prisma, generateDemandeAchatNumber, generateBonCommandeNumber, generateProformaNumber,
  normalizeQuoteLines, normalizeProformaLines, calculateTotals, serializeQuote, serializeOrder, serializeProforma,
  enqueueProcurementEvent, applyEnterpriseScope, resolveEnterpriseContext, withEnterpriseContext,
  proformaInclude, quoteInclude, purchaseQuoteCreatedPayload, purchaseQuoteSubmittedPayload,
  purchaseQuoteRejectedPayload, purchaseQuoteApprovedPayload, proformaCreatedPayload, proformaSubmittedPayload,
  proformaApprovedPayload, proformaRejectedPayload, purchaseOrderCreatedPayload,
};
