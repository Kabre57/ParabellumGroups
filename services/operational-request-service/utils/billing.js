const findBillingVouchers = async (req, request) => {
  const baseUrl = String(process.env.BILLING_SERVICE_URL || 'http://localhost:4010').replace(/\/$/, '');
  const url = new URL(`${baseUrl}/api/cash-vouchers`);
  url.searchParams.set('enterpriseId', String(request.enterpriseId));
  url.searchParams.set('sourceId', request.id);
  url.searchParams.set('sourceType', 'OPERATIONAL_REQUEST');
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${req.token}`,
      'X-Enterprise-Id': String(request.enterpriseId),
    },
  });
  if (!response.ok) {
    throw Object.assign(
      new Error(
        response.status === 403
          ? 'Votre rôle ne peut pas consulter les bons de caisse.'
          : 'Impossible de vérifier le bon de caisse dans Billing.'
      ),
      { statusCode: response.status === 403 ? 403 : 503 }
    );
  }
  const payload = await response.json();
  const vouchers = Array.isArray(payload?.data) ? payload.data : [];
  return vouchers.filter(
    (voucher) =>
      voucher.sourceId === request.id &&
      voucher.sourceType === 'OPERATIONAL_REQUEST' &&
      Number(voucher.enterpriseId) === Number(request.enterpriseId)
  );
};

const selectActiveBillingVoucher = (vouchers) =>
  vouchers.find((voucher) => voucher.status !== 'ANNULE') || vouchers[0] || null;

// #2 / P1 — Règle de qualification du résultat d'un lookup Billing après un 409.
// Fonction pure : prend la liste brute de bons retournée par findBillingVouchers
// et retourne un résultat structuré indiquant si un bon utilisable existe.
//   → { found: true,  voucher }  : bon actif trouvé → linkCashVoucher peut lier.
//   → { found: false }           : aucun bon → propager l'erreur Billing d'origine.
// Séparée du contrôleur pour être testable sans base de données ni service externe.
const classifyVoucherLookupResult = (vouchers) => {
  const voucher = selectActiveBillingVoucher(vouchers);
  if (!voucher) return { found: false };
  return { found: true, voucher };
};

const BILLING_CREATE_FALLBACK_MESSAGE = 'Billing n’a pas pu créer le bon de caisse.';

// POST /api/cash-vouchers. Ne lève pas sur une réponse HTTP d'erreur : retourne
// { ok, status, message, voucher } pour conserver le message Billing original.
// Une erreur réseau est renvoyée avec status 0.
const createBillingVoucher = async (req, request, payload) => {
  const baseUrl = String(process.env.BILLING_SERVICE_URL || 'http://localhost:4010').replace(/\/$/, '');
  let response;
  try {
    response = await fetch(`${baseUrl}/api/cash-vouchers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${req.token}`,
        'X-Enterprise-Id': String(request.enterpriseId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, status: 0, message: 'Billing est injoignable.', voucher: null };
  }
  const body = await response.json().catch(() => null);
  const message = typeof body?.message === 'string' && body.message.trim()
    ? body.message
    : BILLING_CREATE_FALLBACK_MESSAGE;
  const voucher = body?.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : null;
  return { ok: response.ok, status: response.status, message, voucher };
};

module.exports = {
  createBillingVoucher,
  findBillingVouchers,
  selectActiveBillingVoucher,
  classifyVoucherLookupResult,
};
