const express = require('express');
const { getAuditLogs } = require('../controllers/audit-log.controller');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/audit-logs
 * @desc    Get audit logs (filtered by user permissions)
 * @access  Private - users with canViewAuditLog* permissions
 */
router.get('/', getAuditLogs);

module.exports = router;
