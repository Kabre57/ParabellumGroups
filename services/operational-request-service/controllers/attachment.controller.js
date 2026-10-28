const crypto = require('node:crypto');
const { actorId, fail, hasPermission } = require('../utils/helpers');
const { resolveActiveEnterprise } = require('../middleware/auth');
const { s3, hasExpectedFileSignature, PutObjectCommand } = require('../utils/s3');
const { getRequestForUser } = require('./shared');

const createAttachmentController = (prisma) => {
  const uploadAttachment = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const result = await getRequestForUser(prisma, req, req.params.id, enterprise);
      if (result.error) return fail(res, result.error.status, result.error.message);
      const request = result.request;
      // #14 / D5-A — manage_attachments est la source de vérité (cf. règles métier §6/D5).
      // La permission finance donne accès aux routes /cash-voucher, /sync, /close — pas aux PJ.
      // Un admin avec * obtient manage_attachments via hasPermission (wildcard → true).
      const mayAttach =
        request.requesterId === actorId(req) ||
        hasPermission(req.user, 'operational_requests.manage_attachments');

      if (!mayAttach) return fail(res, 403, 'Vous ne pouvez pas ajouter une pièce à ce dossier.');
      if (
        !['DRAFT', 'NEEDS_INFO', 'APPROVED', 'IN_FINANCIAL_PROCESS', 'CASH_VOUCHER_CREATED', 'DISBURSED'].includes(
          request.status
        )
      ) {
        return fail(res, 409, 'Les pièces ne peuvent plus être ajoutées à ce dossier.');
      }
      if (!req.file) return fail(res, 400, 'Sélectionnez un fichier PDF, JPG ou PNG de 8 Mo maximum.');
      if (!hasExpectedFileSignature(req.file)) {
        return fail(res, 400, 'Le contenu du fichier ne correspond pas à un PDF, JPG ou PNG valide.');
      }
      const safeName = req.file.originalname.replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 120) || 'piece-jointe';
      const storageKey = `operational-requests/${enterprise.id}/${request.id}/${crypto.randomUUID()}-${safeName}`;
      const bucket = process.env.S3_BUCKET_NAME || 'operational-attachments';
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: req.file.buffer,
          ContentLength: req.file.size,
          ContentType: req.file.mimetype,
          Metadata: { enterpriseid: String(enterprise.id), requestid: request.id },
        })
      );
      const attachment = await prisma.operationalRequestAttachment.create({
        data: {
          requestId: request.id,
          fileName: safeName,
          contentType: req.file.mimetype,
          size: req.file.size,
          storageKey,
          createdById: actorId(req),
        },
      });
      return res.status(201).json({
        success: true,
        data: {
          ...attachment,
          url: `/api/storage/${bucket}/${storageKey.split('/').map(encodeURIComponent).join('/')}?enterpriseId=${enterprise.id}`,
        },
      });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible d’ajouter la pièce jointe.');
    }
  };

  return { uploadAttachment };
};

module.exports = {
  createAttachmentController,
};
