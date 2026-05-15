const { PrismaClient, PurchaseCommitmentStatus } = require('@prisma/client');
const { applyEnterpriseScope, getEnterpriseList } = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const INTERNAL_EVENT_SECRET = process.env.PROCUREMENT_EVENT_SECRET || 'procurement-billing-shared-secret';

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveAccountingCommitmentStatus = () => null;

const pickCommitmentValue = (nextValue, previousValue) => {
  if (nextValue === undefined || nextValue === null || nextValue === '') {
    return previousValue ?? null;
  }
  return nextValue;
};

const ensureInternalEventSecret = (req, res, next) => {
  const secret = req.headers['x-event-secret'];

  if (!secret || secret !== INTERNAL_EVENT_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Event secret invalide',
    });
  }

  next();
};

const upsertCommitment = async (tx, data) => {
  const key = {
    sourceType_sourceId: {
      sourceType: data.sourceType,
      sourceId: data.sourceId,
    },
  };
  const existing = await tx.purchaseCommitment.findUnique({
    where: key,
  });
  const nextStatus = data.status ?? existing?.status ?? null;
  const mergedData = {
    ...data,
    enterpriseId: pickCommitmentValue(data.enterpriseId, existing?.enterpriseId),
    enterpriseName: pickCommitmentValue(data.enterpriseName, existing?.enterpriseName),
    serviceId: pickCommitmentValue(data.serviceId, existing?.serviceId),
    serviceName: pickCommitmentValue(data.serviceName, existing?.serviceName),
    supplierId: pickCommitmentValue(data.supplierId, existing?.supplierId),
    supplierName: pickCommitmentValue(data.supplierName, existing?.supplierName),
  };

  return tx.purchaseCommitment.upsert({
    where: key,
    update: {
      ...mergedData,
      status: nextStatus,
    },
    create: {
      ...mergedData,
      status: nextStatus,
    },
  });
};

const processProcurementEvent = async (event) => {
  const eventId = String(event?.eventId || '');
  const eventType = String(event?.eventType || '');
  const payload = event?.payload || {};

  if (!eventId || !eventType) {
    throw new Error('Event incomplet');
  }

  const existing = await prisma.billingProcessedEvent.findUnique({
    where: { eventId },
  });

  if (existing) {
    return { ignored: true };
  }

  await prisma.$transaction(async (tx) => {
    switch (eventType) {
      case 'procurement.purchase_quote.created':
      case 'procurement.purchase_quote.submitted':
      case 'procurement.purchase_quote.rejected':
      case 'procurement.purchase_quote.approved': {
        await upsertCommitment(tx, {
          sourceType: 'PURCHASE_QUOTE',
          sourceId: String(payload.purchaseQuoteId),
          sourceNumber: payload.purchaseQuoteNumber || 'N/A',
          enterpriseId: payload.enterpriseId != null ? Number(payload.enterpriseId) : null,
          enterpriseName: payload.enterpriseName || null,
          serviceId: payload.serviceId != null ? Number(payload.serviceId) : null,
          serviceName: payload.serviceName || null,
          supplierId: payload.supplierId || null,
          supplierName: payload.supplierName || null,
          sourceStatus: payload.status || 'BROUILLON',
          amountHT: normalizeNumber(payload.amountHT, 0),
          amountTVA: normalizeNumber(payload.amountTVA, 0),
          amountTTC: normalizeNumber(payload.amountTTC, 0),
          currency: payload.currency || 'XOF',
          status: resolveAccountingCommitmentStatus({
            sourceType: 'PURCHASE_QUOTE',
            sourceStatus: payload.status || 'BROUILLON',
          }),
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        });
        break;
      }
      case 'procurement.purchase_proforma.created':
      case 'procurement.purchase_proforma.submitted':
      case 'procurement.purchase_proforma.approved':
      case 'procurement.purchase_proforma.rejected': {
        const shouldKeepSelectedSupplier = Boolean(payload.selectedForOrder);
        await upsertCommitment(tx, {
          sourceType: 'PURCHASE_QUOTE',
          sourceId: String(payload.purchaseQuoteId),
          sourceNumber: payload.purchaseQuoteNumber || 'N/A',
          enterpriseId: payload.enterpriseId != null ? Number(payload.enterpriseId) : null,
          enterpriseName: payload.enterpriseName || null,
          serviceId: payload.serviceId != null ? Number(payload.serviceId) : null,
          serviceName: payload.serviceName || null,
          supplierId: shouldKeepSelectedSupplier ? payload.supplierId || null : undefined,
          supplierName: shouldKeepSelectedSupplier ? payload.supplierName || null : undefined,
          sourceStatus: payload.quoteStatus || payload.status || 'BROUILLON',
          amountHT: normalizeNumber(payload.amountHT, 0),
          amountTVA: normalizeNumber(payload.amountTVA, 0),
          amountTTC: normalizeNumber(payload.amountTTC, 0),
          currency: payload.currency || 'XOF',
          status: resolveAccountingCommitmentStatus({
            sourceType: 'PURCHASE_QUOTE',
            sourceStatus: payload.quoteStatus || payload.status || 'BROUILLON',
          }),
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        });
        break;
      }
      case 'procurement.purchase_order.created': {
        await upsertCommitment(tx, {
          sourceType: 'PURCHASE_ORDER',
          sourceId: String(payload.purchaseOrderId),
          sourceNumber: payload.purchaseOrderNumber || 'N/A',
          enterpriseId: payload.enterpriseId != null ? Number(payload.enterpriseId) : null,
          enterpriseName: payload.enterpriseName || null,
          serviceId: payload.serviceId != null ? Number(payload.serviceId) : null,
          serviceName: payload.serviceName || null,
          supplierId: payload.supplierId || null,
          supplierName: payload.supplierName || null,
          sourceStatus: payload.status || 'BROUILLON',
          amountHT: normalizeNumber(payload.amountHT, 0),
          amountTVA: normalizeNumber(payload.amountTVA, 0),
          amountTTC: normalizeNumber(payload.amountTTC, 0),
          currency: payload.currency || 'XOF',
          status: resolveAccountingCommitmentStatus({
            sourceType: 'PURCHASE_ORDER',
            sourceStatus: payload.status || 'BROUILLON',
          }),
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        });

        if (payload.sourcePurchaseQuoteId) {
          await tx.purchaseCommitment.deleteMany({
            where: {
              sourceType: 'PURCHASE_QUOTE',
              sourceId: String(payload.sourcePurchaseQuoteId),
            },
          });
        }
        break;
      }
      case 'procurement.purchase_order.status_changed': {
        const commitment = await tx.purchaseCommitment.findFirst({
          where: {
            sourceType: 'PURCHASE_ORDER',
            sourceId: String(payload.purchaseOrderId),
          },
        });

        if (commitment) {
          const nextSourceStatus = payload.toStatus || payload.status || 'BROUILLON';
          const nextAccountingStatus = resolveAccountingCommitmentStatus({
            sourceType: 'PURCHASE_ORDER',
            sourceStatus: nextSourceStatus,
          });
          const updated = await tx.purchaseCommitment.update({
            where: { id: commitment.id },
            data: {
              sourceStatus: nextSourceStatus,
              status: nextAccountingStatus,
              enterpriseId: payload.enterpriseId != null ? Number(payload.enterpriseId) : null,
              enterpriseName: payload.enterpriseName || null,
              serviceId: payload.serviceId != null ? Number(payload.serviceId) : null,
              serviceName: payload.serviceName || null,
              amountTTC: normalizeNumber(payload.amountTTC, 0),
            },
          });

        }
        break;
      }
      default:
        break;
    }

    await tx.billingProcessedEvent.create({
      data: {
        eventId,
        eventType,
        source: event.source || 'procurement-service',
      },
    });
  });

  return { ignored: false };
};

exports.ensureInternalEventSecret = ensureInternalEventSecret;

exports.ingestProcurementEvent = async (req, res) => {
  try {
    const result = await processProcurementEvent(req.body);

    res.status(202).json({
      success: true,
      ignored: result.ignored,
    });
  } catch (error) {
    console.error('Erreur ingestion event procurement:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement de l\'événement achats',
    });
  }
};

exports.getAllPurchaseCommitments = async (req, res) => {
  try {
    const scopedWhere = await applyEnterpriseScope({
      req,
      where: {},
      requestedEnterpriseId: req.query.enterpriseId,
    });
    const commitments = await prisma.purchaseCommitment.findMany({
      where: scopedWhere,
      orderBy: { createdAt: 'desc' },
    });
    const enterprises = await getEnterpriseList(req).catch(() => []);
    const enterpriseNameById = new Map(
      (Array.isArray(enterprises) ? enterprises : []).map((enterprise) => [
        Number(enterprise.id),
        enterprise.name || enterprise.nom || enterprise.label || enterprise.libelle || null,
      ])
    );
    const hydratedCommitments = commitments.map((commitment) => ({
      ...commitment,
      enterpriseName:
        commitment.enterpriseName ||
        (commitment.enterpriseId != null ? enterpriseNameById.get(Number(commitment.enterpriseId)) || null : null),
    }));

    res.json({
      success: true,
      data: hydratedCommitments,
    });
  } catch (error) {
    console.error('Erreur lecture engagements achats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des engagements achats',
    });
  }
};

exports.getPurchaseCommitmentsStats = async (req, res) => {
  try {
    const commitments = await prisma.purchaseCommitment.findMany({
      where: await applyEnterpriseScope({
        req,
        where: {},
        requestedEnterpriseId: req.query.enterpriseId,
      }),
    });

    const orders = commitments.filter((item) => item.sourceType === 'PURCHASE_ORDER');
    const quotes = commitments.filter((item) => item.sourceType === 'PURCHASE_QUOTE');

    res.json({
      success: true,
      data: {
        totalPurchases: commitments.length,
        pendingQuotes: quotes.filter((item) => item.sourceStatus === 'SOUMISE').length,
        draftQuotes: quotes.filter((item) => item.sourceStatus === 'BROUILLON').length,
        rejectedQuotes: quotes.filter((item) => item.sourceStatus === 'REJETEE').length,
        draftOrders: orders.filter((item) => item.sourceStatus === 'BROUILLON').length,
        confirmedOrders: orders.filter((item) => item.sourceStatus === 'CONFIRME').length,
        receivedOrders: orders.filter((item) => item.sourceStatus === 'LIVRE').length,
        cancelledOrders: orders.filter((item) => item.sourceStatus === 'ANNULE').length,
        totalCommittedAmount: commitments.reduce((sum, item) => sum + normalizeNumber(item.amountTTC, 0), 0),
      },
    });
  } catch (error) {
    console.error('Erreur stats engagements achats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques achats',
    });
  }
};

exports.validatePurchaseCommitment = async (req, res) => {
  try {
    const { id } = req.params;

    const commitment = await prisma.purchaseCommitment.findUnique({
      where: { id },
    });

    if (!commitment) {
      return res.status(404).json({
        success: false,
        message: 'Engagement achat introuvable',
      });
    }

    const normalizedSourceStatus = String(commitment.sourceStatus || '').toUpperCase();
    if (!['APPROUVEE', 'CONFIRME', 'PROFORMA_APPROUVEE'].includes(normalizedSourceStatus)) {
      return res.status(400).json({
        success: false,
        message: "Cet engagement n'est pas encore prêt pour une validation comptable.",
      });
    }

    if (
      commitment.sourceType === 'PURCHASE_QUOTE' &&
      !String(commitment.supplierId || '').trim() &&
      !String(commitment.supplierName || '').trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Veuillez d'abord retenir une proforma fournisseur avant de valider comptablement cette demande d'achat.",
      });
    }

    if (commitment.status) {
      return res.json({
        success: true,
        data: commitment,
        message: 'Engagement déjà validé ou traité.',
      });
    }

    const updatedCommitment = await prisma.purchaseCommitment.update({
      where: { id },
      data: { status: PurchaseCommitmentStatus.ENGAGE },
    });

    return res.json({
      success: true,
      data: updatedCommitment,
      message: 'Engagement validé par la comptabilité. Il peut maintenant être liquidé puis décaissé.',
    });
  } catch (error) {
    console.error('Erreur validation engagement achat:', error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la validation de l'engagement achat",
    });
  }
};
