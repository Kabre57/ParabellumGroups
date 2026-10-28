const crypto = require('node:crypto');
const { TYPES, STATUSES, FINANCE_STATUSES, prismaSelect } = require('../utils/constants');
const { actorId, actorName, fail, hasPermission } = require('../utils/helpers');
const { resolveActiveEnterprise } = require('../middleware/auth');
const { getRecipients, enqueueNotifications } = require('../utils/outbox');
const {
  getRequestForUser,
  serializeRequest,
  validateRequestFields,
  writeLog,
  transitionByExpectedStatus,
} = require('./shared');
const { createFinancialProcessingController } = require('./financialProcessing.controller');
const { createAttachmentController } = require('./attachment.controller');

const createOperationalRequestController = (prisma) => {
  const financialController = createFinancialProcessingController(prisma);
  const attachmentController = createAttachmentController(prisma);

  const createRequest = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const validation = validateRequestFields(req.body);
      if (validation.error) return fail(res, 400, validation.error);
      const userId = actorId(req);
      if (!userId || userId === 'undefined') return fail(res, 401, 'Utilisateur non identifié.');
      const requestNumber = `DO-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const request = await prisma.$transaction(async (tx) => {
        const created = await tx.operationalRequest.create({
          data: {
            requestNumber,
            ...validation.data,
            currency: 'XOF',
            enterpriseId: Number(enterprise.id),
            enterpriseName: enterprise.name,
            serviceId: req.user.serviceId ? Number(req.user.serviceId) : null,
            serviceName: req.user.serviceName || null,
            requesterId: userId,
            requesterName: actorName(req),
            requesterEmail: req.user.email,
          },
        });
        await writeLog(tx, req, created, 'CREATED', null, 'DRAFT', null);
        return tx.operationalRequest.findUnique({ where: { id: created.id }, include: prismaSelect });
      });
      return res.status(201).json({ success: true, data: serializeRequest(request, enterprise.id) });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de créer la demande.');
    }
  };

  const listRequests = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const where = { enterpriseId: Number(enterprise.id) };
      const canReadAll = hasPermission(req.user, 'operational_requests.read_all');
      const canReadFinance = hasPermission(req.user, 'operational_requests.finance');
      if (!canReadAll && !canReadFinance) where.requesterId = actorId(req);
      if (req.query.financeQueue === 'true') {
        if (!canReadFinance) return fail(res, 403, 'Vous ne disposez pas de la permission financière.');
        where.status = { in: FINANCE_STATUSES };
      } else if (canReadFinance && !canReadAll && !req.query.mine) {
        where.status = { in: FINANCE_STATUSES };
      }
      if (req.query.mine === 'true') where.requesterId = actorId(req);
      if (req.query.status && STATUSES.has(String(req.query.status))) where.status = String(req.query.status);
      if (req.query.type && String(req.query.type).trim()) where.type = String(req.query.type).trim();
      if (req.query.search) {
        const search = String(req.query.search).trim().slice(0, 100);
        where.OR = [
          { requestNumber: { contains: search, mode: 'insensitive' } },
          { beneficiaryName: { contains: search, mode: 'insensitive' } },
          { reason: { contains: search, mode: 'insensitive' } },
        ];
      }
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const skip = (page - 1) * limit;
      const [requests, total] = await Promise.all([
        prisma.operationalRequest.findMany({ where, include: prismaSelect, orderBy: { createdAt: 'desc' }, take: limit, skip }),
        prisma.operationalRequest.count({ where }),
      ]);
      return res.json({
        success: true,
        data: requests.map((item) => serializeRequest(item, enterprise.id)),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de charger les demandes.');
    }
  };

  const getRequest = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      return res.json({ success: true, data: serializeRequest(result.request, enterprise.id) });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de charger la demande.');
    }
  };

  const updateRequest = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (request.requesterId !== actorId(req)) return fail(res, 403, 'Seul le demandeur peut modifier ce dossier.');
      if (!['DRAFT', 'NEEDS_INFO'].includes(request.status)) return fail(res, 409, 'Cette demande ne peut plus être modifiée.');
      const validation = validateRequestFields(req.body, { partial: true });
      if (validation.error) return fail(res, 400, validation.error);
      if (!Object.keys(validation.data).length) return fail(res, 400, 'Aucune modification à enregistrer.');
      const updated = await prisma.$transaction(async (tx) => {
        await tx.operationalRequest.update({ where: { id: request.id }, data: validation.data });
        await writeLog(tx, req, request, 'UPDATED', request.status, request.status, null);
        return tx.operationalRequest.findUnique({ where: { id: request.id }, include: prismaSelect });
      });
      return res.json({ success: true, data: serializeRequest(updated, enterprise.id) });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de modifier la demande.');
    }
  };

  const submitRequest = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (request.requesterId !== actorId(req)) return fail(res, 403, 'Seul le demandeur peut soumettre ce dossier.');
      if (!['DRAFT', 'NEEDS_INFO'].includes(request.status)) return fail(res, 409, 'Cette demande ne peut pas être soumise dans son état actuel.');
      if (!request.beneficiaryName.trim() || !request.reason.trim() || Number(request.amountRequested) <= 0) {
        return fail(res, 400, 'Le bénéficiaire, le motif et un montant supérieur à zéro sont obligatoires.');
      }
      const approvers = await getRecipients(req, enterprise.id, 'operational_requests.approve');
      if (!approvers.length) return fail(res, 409, 'Aucun décideur autorisé n’est configuré pour cette entreprise.');
      const updated = await prisma.$transaction(async (tx) => {
        await transitionByExpectedStatus(tx, request, request.status, { status: 'SUBMITTED', submittedAt: new Date(), decisionComment: null });
        const changed = await tx.operationalRequest.findUnique({ where: { id: request.id } });
        await writeLog(tx, req, request, 'SUBMITTED', request.status, 'SUBMITTED', req.body.comment);
        await enqueueNotifications(tx, {
          request,
          recipients: approvers,
          title: 'Nouvelle demande opérationnelle à valider',
          message: `${request.requesterName} a soumis la demande ${request.requestNumber} pour ${request.amountRequested.toString()} XOF.`,
          action: 'SUBMITTED',
        });
        return tx.operationalRequest.findUnique({ where: { id: changed.id }, include: prismaSelect });
      });
      return res.json({ success: true, data: serializeRequest(updated, enterprise.id) });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de soumettre la demande.');
    }
  };

  const decideRequest = (decision) => async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      if (request.requesterId === actorId(req)) return fail(res, 403, 'Vous ne pouvez pas approuver votre propre demande.');
      if (request.status !== 'SUBMITTED') return fail(res, 409, 'Seule une demande soumise peut être décidée.');
      const comment = String(req.body.comment || '').trim();
      if (decision !== 'APPROVED' && !comment) return fail(res, 400, 'Un motif est obligatoire pour cette décision.');
      const nextStatus = decision;
      const logAction = decision === 'NEEDS_INFO' ? 'RETURNED' : decision;
      const recipients = [request.requesterId];
      if (decision === 'APPROVED') recipients.push(...await getRecipients(req, enterprise.id, 'operational_requests.finance'));
      const updated = await prisma.$transaction(async (tx) => {
        const changes = { status: nextStatus, decisionComment: comment || null };
        if (decision === 'APPROVED') {
          changes.amountApproved = request.amountRequested;
          changes.approvedAt = new Date();
        }
        if (decision === 'REJECTED') changes.rejectedAt = new Date();
        await transitionByExpectedStatus(tx, request, 'SUBMITTED', changes);
        const changed = await tx.operationalRequest.findUnique({ where: { id: request.id } });
        await writeLog(tx, req, request, logAction, 'SUBMITTED', nextStatus, comment);
        await enqueueNotifications(tx, {
          request,
          recipients,
          title: decision === 'APPROVED' ? 'Demande opérationnelle approuvée' : 'Demande opérationnelle mise à jour',
          message: decision === 'APPROVED'
            ? `La demande ${request.requestNumber} est approuvée et disponible pour traitement financier.`
            : decision === 'REJECTED'
              ? `La demande ${request.requestNumber} a été rejetée : ${comment}`
              : `La demande ${request.requestNumber} a été retournée pour complément : ${comment}`,
          action: logAction,
        });
        return tx.operationalRequest.findUnique({ where: { id: changed.id }, include: prismaSelect });
      });
      return res.json({ success: true, data: serializeRequest(updated, enterprise.id) });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible d’enregistrer la décision.');
    }
  };

  return {
    createRequest,
    listRequests,
    getRequest,
    updateRequest,
    submitRequest,
    decideRequest,
    beginFinancialProcessing: financialController.beginFinancialProcessing,
    linkCashVoucher: financialController.linkCashVoucher,
    createCashVoucherWithOrchestration: financialController.createCashVoucherWithOrchestration,
    syncCashVoucher: financialController.syncCashVoucher,
    closeRequest: financialController.closeRequest,
    uploadAttachment: attachmentController.uploadAttachment,
  };
};

module.exports = {
  createOperationalRequestController,
  getRequestForUser,
  serializeRequest,
  validateRequestFields,
  writeLog,
  transitionByExpectedStatus,
};
