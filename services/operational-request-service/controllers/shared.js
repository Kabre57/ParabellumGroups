const { TYPES, FINANCE_STATUSES, prismaSelect } = require('../utils/constants');
const { actorId, actorName, hasPermission } = require('../utils/helpers');

const getRequestForUser = async (prisma, req, id, enterprise) => {
  const request = await prisma.operationalRequest.findFirst({
    where: { id, enterpriseId: Number(enterprise.id) },
    include: prismaSelect,
  });
  if (!request) return { error: { status: 404, message: 'Demande introuvable.' } };
  const userId = actorId(req);
  const isOwner = request.requesterId === userId;
  const canReadAll = hasPermission(req.user, 'operational_requests.read_all');
  const canReadFinance =
    hasPermission(req.user, 'operational_requests.finance') && FINANCE_STATUSES.includes(request.status);
  if (!isOwner && !canReadAll && !canReadFinance) {
    return { error: { status: 403, message: 'Accès refusé à cette demande.' } };
  }
  return { request };
};

const serializeRequest = (request, enterpriseId) => ({
  ...request,
  amountRequested: request.amountRequested.toString(),
  amountApproved: request.amountApproved?.toString() ?? null,
  attachments: (request.attachments || []).map((attachment) => ({
    ...attachment,
    url: `/api/storage/operational-attachments/${attachment.storageKey
      .split('/')
      .map(encodeURIComponent)
      .join('/')}?enterpriseId=${enterpriseId}`,
  })),
});

const validateRequestFields = (body, { partial = false } = {}) => {
  const data = {};
  const stringFields = ['beneficiaryName', 'reason'];
  for (const field of stringFields) {
    if (body[field] !== undefined) {
      const value = String(body[field] || '').trim();
      if (!value) {
        // #29 / D4-A — Champ obligatoire fourni vide : rejeté même en mode partial.
        // Un PATCH sans ce champ (undefined) reste valide. Un PATCH avec '' ne l'est pas.
        const label = field === 'reason' ? 'Le motif' : 'Le bénéficiaire';
        return { error: `${label} ne peut pas être vide.` };
      }
      data[field] = value;
    }
  }

  if (body.type !== undefined) {
    const type = String(body.type).toUpperCase();
    if (!TYPES.has(type)) return { error: 'Type de demande invalide.' };
    data.type = type;
  } else if (!partial) {
    return { error: 'Le type de demande est obligatoire.' };
  }
  if (body.amountRequested !== undefined) {
    const amount = Number(body.amountRequested);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
      return { error: 'Le montant doit être supérieur à zéro.' };
    }
    data.amountRequested = amount.toFixed(2);
  } else if (!partial) {
    return { error: 'Le montant estimé est obligatoire.' };
  }
  if (body.desiredDate !== undefined) {
    const date = body.desiredDate ? new Date(body.desiredDate) : null;
    if (date && Number.isNaN(date.getTime())) return { error: 'La date souhaitée est invalide.' };
    data.desiredDate = date;
  }
  if (body.details !== undefined) {
    if (!body.details || typeof body.details !== 'object' || Array.isArray(body.details)) {
      return { error: 'Les détails de la demande sont invalides.' };
    }
    data.details = body.details;
  }
  return { data };
};

const writeLog = async (tx, req, request, action, fromStatus, toStatus, comment) =>
  tx.operationalRequestLog.create({
    data: {
      requestId: request.id,
      action,
      fromStatus,
      toStatus,
      actorId: actorId(req),
      actorName: actorName(req),
      comment: comment || null,
    },
  });

const transitionByExpectedStatus = async (tx, request, expectedStatus, data) => {
  const result = await tx.operationalRequest.updateMany({ where: { id: request.id, status: expectedStatus }, data });
  if (result.count !== 1) {
    throw Object.assign(new Error('La demande a été modifiée entre-temps. Rechargez-la.'), { statusCode: 409 });
  }
};

module.exports = {
  getRequestForUser,
  serializeRequest,
  validateRequestFields,
  writeLog,
  transitionByExpectedStatus,
};
