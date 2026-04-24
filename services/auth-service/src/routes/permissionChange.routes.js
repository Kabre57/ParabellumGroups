const express = require('express');
const { body, query } = require('express-validator');
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const {
  listRequests,
  createRequest,
  approveRequest,
  rejectRequest,
  testEmailNotification,
  testSlackNotification,
} = require('../controllers/permissionChange.controller');

const router = express.Router();
router.use(authenticate);

// List requests (optional status filter)
router.get('/', checkRole(['ADMIN']), listRequests);

// Create a new change request
router.post(
  '/',
  checkRole(['ADMIN']),
  [
    body('roleId').isInt().withMessage('roleId must be an integer'),
    body('permissionId').isInt().withMessage('permissionId must be an integer'),
    body('canView').optional().isBoolean(),
    body('canCreate').optional().isBoolean(),
    body('canEdit').optional().isBoolean(),
    body('canDelete').optional().isBoolean(),
    body('canApprove').optional().isBoolean(),
  ],
  createRequest
);

// Approve or reject
router.patch('/:id/approve', checkRole(['ADMIN','GENERAL_DIRECTOR']), approveRequest);
router.patch('/:id/reject', checkRole(['ADMIN','GENERAL_DIRECTOR']), [body('reason').optional().isString()], rejectRequest);

// Test routes for notifications
router.post('/test-notifications/email', checkRole(['ADMIN']), [
  body('to').isEmail().withMessage('Valid email required'),
  body('subject').isString().withMessage('Subject required'),
  body('message').isString().withMessage('Message required'),
], testEmailNotification);

router.post('/test-notifications/slack', checkRole(['ADMIN']), [
  body('message').isString().withMessage('Message required'),
], testSlackNotification);

module.exports = router;
