const axios = require('axios');

const PAYMENT_MARKER_REGEX = /\[PAYMENT:([^\]]+)\]/i;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parsePaymentMarker = (notes = null) => {
  const match = String(notes || '').match(PAYMENT_MARKER_REGEX);
  return match?.[1] || null;
};

const looksLikeGeneratedReference = (value) => UUID_REGEX.test(String(value || '').trim());

const fetchClientMeta = async (req, clientId) => {
  if (!clientId) {
    return { clientName: null, clientEmail: null, clientPhone: null };
  }

  try {
    const customerBase = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';
    const resp = await axios.get(`${customerBase}/api/clients/${clientId}`, {
      headers: { authorization: req.headers.authorization || '' },
    });

    return {
      clientName: resp.data?.data?.nom || null,
      clientEmail: resp.data?.data?.email || null,
      clientPhone: resp.data?.data?.telephone || resp.data?.data?.phone || null,
    };
  } catch (error) {
    console.warn('Meta client encaissement non recuperee', error?.response?.status || error.message);
    return { clientName: null, clientEmail: null, clientPhone: null };
  }
};

const enrichEncaissementsWithInvoiceContext = async (tx, req, encaissements = []) => {
  if (!Array.isArray(encaissements) || encaissements.length === 0) {
    return [];
  }

  const invoiceIds = [...new Set(encaissements.map((item) => item.factureClientId).filter(Boolean))];
  const paymentIds = [
    ...new Set(encaissements.map((item) => parsePaymentMarker(item.notes)).filter(Boolean)),
  ];

  const [factures, paiements] = await Promise.all([
    invoiceIds.length
      ? tx.facture.findMany({
          where: { id: { in: invoiceIds } },
          select: {
            id: true,
            clientId: true,
            numeroFacture: true,
          },
        })
      : [],
    paymentIds.length
      ? tx.paiement.findMany({
          where: { id: { in: paymentIds } },
          select: {
            id: true,
            reference: true,
          },
        })
      : [],
  ]);

  const invoiceMap = new Map(factures.map((facture) => [facture.id, facture]));
  const paymentMap = new Map(paiements.map((paiement) => [paiement.id, paiement]));
  const clientIds = [...new Set(factures.map((facture) => facture.clientId).filter(Boolean))];
  const clientMetaEntries = await Promise.all(
    clientIds.map(async (clientId) => [clientId, await fetchClientMeta(req, clientId)])
  );
  const clientMetaMap = new Map(clientMetaEntries);

  return encaissements.map((encaissement) => {
    const linkedInvoice = encaissement.factureClientId
      ? invoiceMap.get(encaissement.factureClientId)
      : null;
    const clientMeta = linkedInvoice?.clientId ? clientMetaMap.get(linkedInvoice.clientId) : null;
    const linkedPaymentId = parsePaymentMarker(encaissement.notes);
    const linkedPayment = linkedPaymentId ? paymentMap.get(linkedPaymentId) : null;
    const normalizedStoredName = String(encaissement.clientName || '').trim();
    const invoiceNumber = linkedInvoice?.numeroFacture || null;
    const safeStoredName =
      normalizedStoredName && normalizedStoredName !== invoiceNumber ? normalizedStoredName : null;
    const derivedClientName =
      clientMeta?.clientName ||
      safeStoredName ||
      'Client';
    const derivedReference = linkedPayment?.reference
      ? linkedPayment.reference
      : encaissement.reference && encaissement.reference === invoiceNumber
      ? null
      : looksLikeGeneratedReference(encaissement.reference)
      ? null
      : encaissement.reference || null;

    return {
      ...encaissement,
      clientName: derivedClientName,
      clientPhone: clientMeta?.clientPhone || null,
      reference: derivedReference,
    };
  });
};

module.exports = {
  fetchClientMeta,
  enrichEncaissementsWithInvoiceContext,
  parsePaymentMarker,
};
