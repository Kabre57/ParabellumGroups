const { prismaSelect } = require('../utils/constants');
const { fail } = require('../utils/helpers');
const { resolveActiveEnterprise } = require('../middleware/auth');
const { enqueueNotifications } = require('../utils/outbox');
const {
  createBillingVoucher,
  findBillingVouchers,
  selectActiveBillingVoucher,
  classifyVoucherLookupResult,
} = require('../utils/billing');

const PAYMENT_METHODS = new Set(['ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE']);

// Un bon n'est liable que s'il appartient à la demande et n'est pas annulé.
const isLinkableVoucher = (voucher, request) =>
  Boolean(voucher) &&
  typeof voucher.id === 'string' && voucher.id &&
  typeof voucher.voucherNumber === 'string' && voucher.voucherNumber &&
  voucher.sourceId === request.id &&
  voucher.sourceType === 'OPERATIONAL_REQUEST' &&
  Number(voucher.enterpriseId) === Number(request.enterpriseId) &&
  voucher.status !== 'ANNULE';

const buildCashVoucherPayload = (request, { paymentMethod, treasuryAccountId }) => {
  const amount = Number(request.amountApproved ?? request.amountRequested);
  return {
    sourceType: 'OPERATIONAL_REQUEST',
    sourceId: request.id,
    sourceNumber: request.requestNumber,
    expenseCategory: request.type,
    enterpriseId: request.enterpriseId,
    enterpriseName: request.enterpriseName,
    ...(request.serviceId !== null && request.serviceId !== undefined ? { serviceId: request.serviceId } : {}),
    ...(request.serviceName ? { serviceName: request.serviceName } : {}),
    beneficiaryName: request.beneficiaryName,
    description: request.reason,
    amountHT: amount,
    amountTVA: 0,
    amountTTC: amount,
    currency: request.currency,
    paymentMethod,
    flowType: 'DECAISSEMENT',
    treasuryAccountId,
    issueDate: new Date().toISOString(),
    status: 'BROUILLON',
    notes: `Créé depuis la demande ${request.requestNumber}`,
  };
};
const {
  getRequestForUser,
  serializeRequest,
  writeLog,
  transitionByExpectedStatus,
} = require('./shared');

const createFinancialProcessingController = (prisma) => {
  const beginFinancialProcessing = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (request.status !== 'APPROVED') return fail(res, 409, 'Seule une demande approuvée peut être prise en charge.');
      const updated = await prisma.$transaction(async (tx) => {
        await transitionByExpectedStatus(tx, request, 'APPROVED', { status: 'IN_FINANCIAL_PROCESS' });
        await writeLog(tx, req, request, 'FINANCIAL_PROCESSING_STARTED', 'APPROVED', 'IN_FINANCIAL_PROCESS', req.body.comment);
        return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
      });
      return res.json({ success: true, data: serializeRequest(updated, enterprise.id) });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de démarrer le traitement financier.');
    }
  };

  const linkCashVoucher = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (!['APPROVED', 'IN_FINANCIAL_PROCESS', 'CASH_VOUCHER_CREATED'].includes(request.status)) {
        return fail(res, 409, 'La demande ne peut pas encore recevoir de bon de caisse.');
      }
      // #6 — Pas de check CLOSED ici : le guard lignes 38-40 l'exclut déjà.
      // APPROVED | IN_FINANCIAL_PROCESS | CASH_VOUCHER_CREATED sont les seuls statuts valides à ce stade.
      const vouchers = await findBillingVouchers(req, request);

      const lookup = classifyVoucherLookupResult(vouchers);
      if (!lookup.found) return fail(res, 404, 'Bon de caisse introuvable dans Billing.');
      const voucher = lookup.voucher;
      if (voucher.status === 'ANNULE') {
        if (!['CASH_VOUCHER_CREATED', 'IN_FINANCIAL_PROCESS'].includes(request.status)) {
          return fail(res, 409, 'Le bon de caisse est annulé. La demande doit être vérifiée par la comptabilité.');
        }
        const updated = await prisma.$transaction(async (tx) => {
          await transitionByExpectedStatus(tx, request, request.status, {
            status: 'IN_FINANCIAL_PROCESS',
            cashVoucherId: null,
            cashVoucherNumber: null,
          });
          await writeLog(tx, req, request, 'CASH_VOUCHER_CANCELLED', request.status, 'IN_FINANCIAL_PROCESS', `Le bon ${voucher.voucherNumber} a été annulé. Un nouveau bon est requis.`);
          await enqueueNotifications(tx, {
            request,
            recipients: [request.requesterId],
            title: 'Bon de caisse annulé',
            message: `Le bon ${voucher.voucherNumber} lié à la demande ${request.requestNumber} a été annulé.`,
            action: 'CASH_VOUCHER_CANCELLED',
          });
          return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
        });
        return res.json({ success: true, message: 'Le bon a été annulé. La comptabilité peut en créer un nouveau.', data: serializeRequest(updated, enterprise.id) });
      }
      const resolvedStatus = voucher.status === 'DECAISSE' ? 'DISBURSED' : 'CASH_VOUCHER_CREATED';
      if (request.cashVoucherId === voucher.id && request.status === resolvedStatus) {
        return res.json({ success: true, data: serializeRequest(request, enterprise.id), cashVoucher: voucher });
      }
      if (request.cashVoucherId && request.cashVoucherId !== voucher.id) {
        return fail(res, 409, 'Un autre bon de caisse est déjà lié à cette demande.');
      }
      const updated = await prisma.$transaction(async (tx) => {
        await transitionByExpectedStatus(tx, request, request.status, {
          status: voucher.status === 'DECAISSE' ? 'DISBURSED' : 'CASH_VOUCHER_CREATED',
          cashVoucherId: voucher.id,
          cashVoucherNumber: voucher.voucherNumber,
          ...(voucher.status === 'DECAISSE' ? { disbursedAt: voucher.disbursementDate ? new Date(voucher.disbursementDate) : new Date() } : {}),
        });
        // #3 — Si la liaison s'effectue directement depuis APPROVED (sans passage explicite par
        // beginFinancialProcessing), le log FINANCIAL_PROCESSING_STARTED doit être écrit ici
        // dans la même transaction pour garantir la cohérence de l'historique.
        if (request.status === 'APPROVED') {
          await writeLog(tx, req, request, 'FINANCIAL_PROCESSING_STARTED', 'APPROVED', 'IN_FINANCIAL_PROCESS', 'Traitement financier démarré lors de la liaison du bon de caisse.');
        }
        const changed = await tx.operationalRequest.findUnique({ where: { id: request.id } });
        await writeLog(tx, req, request, 'CASH_VOUCHER_LINKED', request.status, changed.status, `Bon de caisse ${voucher.voucherNumber} lié.`);
        await enqueueNotifications(tx, { request, recipients: [request.requesterId], title: 'Bon de caisse créé', message: `Le bon de caisse ${voucher.voucherNumber} a été lié à la demande ${request.requestNumber}.`, action: 'CASH_VOUCHER_LINKED' });
        return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
      });

      return res.json({ success: true, data: serializeRequest(updated, enterprise.id), cashVoucher: voucher });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de lier le bon de caisse.');
    }
  };

  // Orchestration serveur : création Billing puis liaison atomique.
  // 1. Billing d'abord (aucune écriture locale en cas d'échec).
  // 2. 409 → GET ?sourceId= pour reprendre un bon existant ; sinon 502 + message Billing original.
  // 3. Bon trouvé → une transaction Prisma : transitions, logs et liaison.
  // Si la transaction échoue après un POST réussi, la demande reste APPROVED ;
  // une nouvelle tentative obtiendra 409 et rattrapera le bon via le GET.
  const createCashVoucherWithOrchestration = async (req, res) => {
    try {
      const paymentMethod = String(req.body?.paymentMethod || '').toUpperCase();
      const treasuryAccountId = String(req.body?.treasuryAccountId || '').trim();
      if (!PAYMENT_METHODS.has(paymentMethod)) return fail(res, 400, 'Mode de règlement invalide.');
      if (!treasuryAccountId) return fail(res, 400, 'Le compte de trésorerie est obligatoire.');

      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (!['APPROVED', 'IN_FINANCIAL_PROCESS'].includes(request.status)) {
        return fail(res, 409, 'La demande ne permet pas de créer un bon de caisse.');
      }
      if (request.cashVoucherId) return fail(res, 409, 'Un bon de caisse est déjà lié à cette demande.');
      const amount = Number(request.amountApproved ?? request.amountRequested);
      if (!Number.isFinite(amount) || amount <= 0) return fail(res, 409, 'Le montant de la demande est invalide.');

      const created = await createBillingVoucher(req, request, buildCashVoucherPayload(request, { paymentMethod, treasuryAccountId }));
      let voucher = created.ok && isLinkableVoucher(created.voucher, request) ? created.voucher : null;
      if (!voucher && (created.ok || created.status === 409)) {
        try {
          const candidate = selectActiveBillingVoucher(await findBillingVouchers(req, request));
          if (isLinkableVoucher(candidate, request)) voucher = candidate;
        } catch {
          voucher = null;
        }
      }
      if (!voucher) return fail(res, 502, created.message);

      const finalStatus = voucher.status === 'DECAISSE' ? 'DISBURSED' : 'CASH_VOUCHER_CREATED';
      const updated = await prisma.$transaction(async (tx) => {
        if (request.status === 'APPROVED') {
          await transitionByExpectedStatus(tx, request, 'APPROVED', { status: 'IN_FINANCIAL_PROCESS' });
          await writeLog(tx, req, request, 'FINANCIAL_PROCESSING_STARTED', 'APPROVED', 'IN_FINANCIAL_PROCESS', 'Traitement financier démarré lors de la création du bon de caisse.');
        }
        await transitionByExpectedStatus(tx, request, 'IN_FINANCIAL_PROCESS', {
          status: finalStatus,
          cashVoucherId: voucher.id,
          cashVoucherNumber: voucher.voucherNumber,
          ...(finalStatus === 'DISBURSED' ? { disbursedAt: voucher.disbursementDate ? new Date(voucher.disbursementDate) : new Date() } : {}),
        });
        await writeLog(tx, req, request, 'CASH_VOUCHER_LINKED', 'IN_FINANCIAL_PROCESS', finalStatus, `Bon de caisse ${voucher.voucherNumber} lié.`);
        await enqueueNotifications(tx, { request, recipients: [request.requesterId], title: 'Bon de caisse créé', message: `Le bon de caisse ${voucher.voucherNumber} a été lié à la demande ${request.requestNumber}.`, action: 'CASH_VOUCHER_LINKED' });
        return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
      });
      return res.json({ success: true, data: serializeRequest(updated, enterprise.id), cashVoucher: voucher });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de créer le bon de caisse.');
    }
  };

  const syncCashVoucher = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (request.status === 'CLOSED') return res.json({ success: true, data: serializeRequest(request, enterprise.id) });
      const vouchers = await findBillingVouchers(req, request);
      const voucher = selectActiveBillingVoucher(vouchers);
      if (!voucher) return fail(res, 404, 'Bon de caisse introuvable dans Billing.');
      if (voucher.status === 'ANNULE') {
        if (!['CASH_VOUCHER_CREATED', 'IN_FINANCIAL_PROCESS'].includes(request.status)) {
          return fail(res, 409, 'Le bon de caisse est annulé. La demande doit être vérifiée par la comptabilité.');
        }
        const updated = await prisma.$transaction(async (tx) => {
          await transitionByExpectedStatus(tx, request, request.status, {
            status: 'IN_FINANCIAL_PROCESS',
            cashVoucherId: null,
            cashVoucherNumber: null,
          });
          await writeLog(tx, req, request, 'CASH_VOUCHER_CANCELLED', request.status, 'IN_FINANCIAL_PROCESS', `Le bon ${voucher.voucherNumber} a été annulé. Un nouveau bon est requis.`);
          await enqueueNotifications(tx, {
            request,
            recipients: [request.requesterId],
            title: 'Bon de caisse annulé',
            message: `Le bon ${voucher.voucherNumber} lié à la demande ${request.requestNumber} a été annulé.`,
            action: 'CASH_VOUCHER_CANCELLED',
          });
          return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
        });
        return res.json({ success: true, message: 'Le bon a été annulé. La comptabilité peut en créer un nouveau.', data: serializeRequest(updated, enterprise.id) });
      }
      if (request.cashVoucherId && request.cashVoucherId !== voucher.id) {
        return fail(res, 409, 'Un autre bon de caisse est déjà lié à cette demande.');
      }
      const nextStatus = voucher.status === 'DECAISSE'
        ? 'DISBURSED'
        : request.status === 'APPROVED' && ['BROUILLON', 'EN_ATTENTE', 'VALIDE'].includes(voucher.status)
          ? 'CASH_VOUCHER_CREATED'
          : request.status;
      if (nextStatus === request.status && request.cashVoucherId === voucher.id) {
        return res.json({ success: true, data: serializeRequest(request, enterprise.id), cashVoucher: voucher });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await transitionByExpectedStatus(tx, request, request.status, {
          status: nextStatus,
          cashVoucherId: voucher.id,
          cashVoucherNumber: voucher.voucherNumber,
          ...(nextStatus === 'DISBURSED' ? { disbursedAt: voucher.disbursementDate ? new Date(voucher.disbursementDate) : new Date() } : {}),
        });
        const changed = await tx.operationalRequest.findUnique({ where: { id: request.id } });
        await writeLog(tx, req, request, voucher.status === 'DECAISSE' ? 'DISBURSED' : 'CASH_VOUCHER_SYNCED', request.status, nextStatus, `Statut Billing : ${voucher.status}.`);
        if (nextStatus === 'DISBURSED') {
          await enqueueNotifications(tx, { request, recipients: [request.requesterId], title: 'Demande décaissée', message: `Le bon de caisse ${voucher.voucherNumber} lié à la demande ${request.requestNumber} est décaissé.`, action: 'DISBURSED' });
        }
        return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
      });
      return res.json({ success: true, data: serializeRequest(updated, enterprise.id), cashVoucher: voucher });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de synchroniser le bon de caisse.');
    }
  };

  const closeRequest = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (request.status !== 'DISBURSED') return fail(res, 409, 'Seule une demande décaissée peut être clôturée.');
      const voucher = selectActiveBillingVoucher(await findBillingVouchers(req, request));
      if (!voucher || voucher.status !== 'DECAISSE') return fail(res, 409, 'Billing ne confirme pas le décaissement de ce bon.');
      const updated = await prisma.$transaction(async (tx) => {
        await transitionByExpectedStatus(tx, request, 'DISBURSED', { status: 'CLOSED', closedAt: new Date() });
        await writeLog(tx, req, request, 'CLOSED', 'DISBURSED', 'CLOSED', String(req.body.comment || '').trim() || null);
        return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
      });
      return res.json({ success: true, data: serializeRequest(updated, enterprise.id) });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de clôturer la demande.');
    }
  };

  return {
    beginFinancialProcessing,
    linkCashVoucher,
    createCashVoucherWithOrchestration,
    syncCashVoucher,
    closeRequest,
  };
};

module.exports = {
  createFinancialProcessingController,
};
