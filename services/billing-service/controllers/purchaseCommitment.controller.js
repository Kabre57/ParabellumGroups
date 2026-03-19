const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const INTERNAL_EVENT_SECRET = process.env.PROCUREMENT_EVENT_SECRET || 'procurement-billing-shared-secret';

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const upsertCommitment = async (tx, data) =>
  tx.purchaseCommitment.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
      },
    },
    update: data,
    create: data,
  });

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
          serviceId: payload.serviceId != null ? Number(payload.serviceId) : null,
          serviceName: payload.serviceName || null,
          supplierId: payload.supplierId || null,
          supplierName: payload.supplierName || null,
          amountHT: normalizeNumber(payload.amountHT, 0),
          amountTVA: normalizeNumber(payload.amountTVA, 0),
          amountTTC: normalizeNumber(payload.amountTTC, 0),
          currency: payload.currency || 'XOF',
          status: payload.status || 'BROUILLON',
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        });
        break;
      }
      case 'procurement.purchase_order.created': {
        await upsertCommitment(tx, {
          sourceType: 'PURCHASE_ORDER',
          sourceId: String(payload.purchaseOrderId),
          sourceNumber: payload.purchaseOrderNumber || 'N/A',
          serviceId: payload.serviceId != null ? Number(payload.serviceId) : null,
          serviceName: payload.serviceName || null,
          supplierId: payload.supplierId || null,
          supplierName: payload.supplierName || null,
          amountHT: normalizeNumber(payload.amountHT, 0),
          amountTVA: normalizeNumber(payload.amountTVA, 0),
          amountTTC: normalizeNumber(payload.amountTTC, 0),
          currency: payload.currency || 'XOF',
          status: payload.status || 'BROUILLON',
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
        await tx.purchaseCommitment.updateMany({
          where: {
            sourceType: 'PURCHASE_ORDER',
            sourceId: String(payload.purchaseOrderId),
          },
          data: {
            status: payload.toStatus || payload.status || 'BROUILLON',
            serviceId: payload.serviceId != null ? Number(payload.serviceId) : null,
            serviceName: payload.serviceName || null,
            amountTTC: normalizeNumber(payload.amountTTC, 0),
          },
        });
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
    const commitments = await prisma.purchaseCommitment.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: commitments,
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
    const commitments = await prisma.purchaseCommitment.findMany();

    const orders = commitments.filter((item) => item.sourceType === 'PURCHASE_ORDER');
    const quotes = commitments.filter((item) => item.sourceType === 'PURCHASE_QUOTE');

    res.json({
      success: true,
      data: {
        totalPurchases: commitments.length,
        pendingQuotes: quotes.filter((item) => item.status === 'SOUMISE').length,
        draftQuotes: quotes.filter((item) => item.status === 'BROUILLON').length,
        rejectedQuotes: quotes.filter((item) => item.status === 'REJETEE').length,
        draftOrders: orders.filter((item) => item.status === 'BROUILLON').length,
        confirmedOrders: orders.filter((item) => item.status === 'CONFIRME').length,
        receivedOrders: orders.filter((item) => item.status === 'LIVRE').length,
        cancelledOrders: orders.filter((item) => item.status === 'ANNULE').length,
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
