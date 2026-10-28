const express = require('express');
const { upload } = require('../utils/s3');
const {
  authenticate,
  requirePermission,
  requireAnyPermission,
} = require('../middleware/auth');
const { createOperationalRequestController } = require('../controllers/operationalRequest.controller');
const { createTypeConfigController } = require('../controllers/typeConfig.controller');

const createOperationalRequestRouter = (prisma) => {
  const router = express.Router();
  const controller = createOperationalRequestController(prisma);
  const typeController = createTypeConfigController(prisma);

  router.use(authenticate);

  // Type configuration routes
  router.get('/types', typeController.listTypes);
  router.post('/types', requirePermission('operational_requests.create'), typeController.createType);
  router.put('/types/:id', requirePermission('operational_requests.create'), typeController.updateType);
  router.delete('/types/:id', requirePermission('operational_requests.create'), typeController.deleteType);

  router.get(
    '/',
    requireAnyPermission(
      'operational_requests.read_own',
      'operational_requests.read_all',
      'operational_requests.finance'
    ),
    controller.listRequests
  );

  router.post('/', requirePermission('operational_requests.create'), controller.createRequest);

  router.get('/:id', controller.getRequest);

  router.patch('/:id', requirePermission('operational_requests.update'), controller.updateRequest);

  router.post('/:id/submit', requirePermission('operational_requests.submit'), controller.submitRequest);

  router.post(
    '/:id/approve',
    requirePermission('operational_requests.approve', { explicit: true }),
    controller.decideRequest('APPROVED')
  );

  router.post(
    '/:id/reject',
    requirePermission('operational_requests.reject', { explicit: true }),
    controller.decideRequest('REJECTED')
  );

  router.post(
    '/:id/return',
    requirePermission('operational_requests.return', { explicit: true }),
    controller.decideRequest('NEEDS_INFO')
  );

  router.post(
    '/:id/financial-processing',
    requirePermission('operational_requests.finance'),
    controller.beginFinancialProcessing
  );

  router.post(
    '/:id/cash-voucher',
    requirePermission('operational_requests.finance'),
    controller.linkCashVoucher
  );

  router.post(
    '/:id/create-cash-voucher',
    requirePermission('operational_requests.finance'),
    controller.createCashVoucherWithOrchestration
  );

  router.post(
    '/:id/sync-cash-voucher',
    requirePermission('operational_requests.finance'),
    controller.syncCashVoucher
  );

  router.post(
    '/:id/close',
    requirePermission('operational_requests.finance'),
    controller.closeRequest
  );

  router.post(
    '/:id/attachments',
    requirePermission('operational_requests.manage_attachments'),
    upload.single('file'),
    controller.uploadAttachment
  );

  return router;
};

module.exports = {
  createOperationalRequestRouter,
};
