const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const notification = require('../services/notificationService');
const emailService = require('../services/emailService');

async function listRequests(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const requests = await prisma.permissionChangeRequest.findMany({
      where,
      include: {
        role: true,
        permission: true,
        requester: { select: { id: true, email: true } },
        reviewer: { select: { id: true, email: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (e) {
    console.error('List requests error', e);
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
}

async function createRequest(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { roleId, permissionId, canView, canCreate, canEdit, canDelete, canApprove, reason } = req.body;

    // basic existence checks
    const role = await prisma.role.findUnique({ where: { id: parseInt(roleId) } });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    const perm = await prisma.permission.findUnique({ where: { id: parseInt(permissionId) } });
    if (!perm) return res.status(404).json({ success: false, message: 'Permission not found' });

    const reqObj = await prisma.permissionChangeRequest.create({
      data: {
        roleId: role.id,
        permissionId: perm.id,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canApprove,
        requestedBy: req.user.id,
        reason,
      },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Send email to requester
    await emailService.notifyRoleChangeRequest(
      {
        email: reqObj.requester.email,
        name: `${reqObj.requester.firstName} ${reqObj.requester.lastName}`,
      },
      role.code,
      reason
    );

    // Get all admins to notify
    const admins = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { code: 'ADMIN' },
          },
        },
      },
      select: { email: true },
    });

    // Send email to admins
    if (admins.length > 0) {
      await emailService.notifyAdminsPendingApproval(
        admins.map(a => a.email),
        {
          requesterName: `${reqObj.requester.firstName} ${reqObj.requester.lastName}`,
          roleName: role.name,
          reason,
          createdAt: reqObj.requestedAt,
        }
      );
    }

    // notify reviewers (e.g., admins)
    notification.notifyAdmins(`New permission change request #${reqObj.id}`);

    res.status(201).json({ success: true, data: reqObj });
  } catch (e) {
    console.error('Create change request error', e);
    res.status(500).json({ success: false, message: 'Error creating request' });
  }
}

async function approveRequest(req, res) {
  try {
    const { id } = req.params;
    const request = await prisma.permissionChangeRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
        reviewer: { select: { firstName: true, lastName: true } },
      },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // apply change
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: request.roleId,
          permissionId: request.permissionId,
        },
      },
      update: {
        canView: request.canView !== null ? request.canView : undefined,
        canCreate: request.canCreate !== null ? request.canCreate : undefined,
        canEdit: request.canEdit !== null ? request.canEdit : undefined,
        canDelete: request.canDelete !== null ? request.canDelete : undefined,
        canApprove: request.canApprove !== null ? request.canApprove : undefined,
      },
      create: {
        roleId: request.roleId,
        permissionId: request.permissionId,
        canView: request.canView || false,
        canCreate: request.canCreate || false,
        canEdit: request.canEdit || false,
        canDelete: request.canDelete || false,
        canApprove: request.canApprove || false,
      },
    });

    // update request status
    const updated = await prisma.permissionChangeRequest.update({
      where: { id: request.id },
      data: {
        status: 'APPROVED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    // audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_PERMISSION_APPROVED',
        entityType: 'PermissionChangeRequest',
        entityId: updated.id.toString(),
        details: `Request #${updated.id} approved`,
        newValue: JSON.stringify(updated),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Send approval email
    await emailService.notifyPermissionApproved(
      {
        email: request.requester.email,
        name: `${request.requester.firstName} ${request.requester.lastName}`,
      },
      {
        view: request.canView,
        create: request.canCreate,
        edit: request.canEdit,
        delete: request.canDelete,
        approve: request.canApprove,
      },
      `${request.reviewer.firstName} ${request.reviewer.lastName}`
    );

    notification.notifyUser(request.requestedBy, `Your permission change request #${updated.id} was approved`);

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('Approve request error', e);
    res.status(500).json({ success: false, message: 'Error approving request' });
  }
}

async function rejectRequest(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await prisma.permissionChangeRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        requester: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    const updated = await prisma.permissionChangeRequest.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reason,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_PERMISSION_REJECTED',
        entityType: 'PermissionChangeRequest',
        entityId: updated.id.toString(),
        details: `Request #${updated.id} rejected`,
        newValue: JSON.stringify(updated),
        level: 'CRITICAL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Send rejection email
    await emailService.notifyPermissionRejected(
      {
        email: request.requester.email,
        name: `${request.requester.firstName} ${request.requester.lastName}`,
      },
      reason,
      req.user.firstName && req.user.lastName ? `${req.user.firstName} ${req.user.lastName}` : req.user.email
    );

    notification.notifyUser(request.requestedBy, `Your permission change request #${updated.id} was rejected`);

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('Reject request error', e);
    res.status(500).json({ success: false, message: 'Error rejecting request' });
  }
}

// Test functions for notifications
async function testEmailNotification(req, res) {
  try {
    const { to, subject, message } = req.body;
    await emailService.sendEmail(to, subject, message);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
}

async function testSlackNotification(req, res) {
  try {
    const { message } = req.body;
    await notification.sendSlackNotification(message);
    res.json({ success: true, message: 'Slack notification sent successfully' });
  } catch (error) {
    console.error('Test Slack error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test Slack notification' });
  }
}

module.exports = {
  listRequests,
  createRequest,
  approveRequest,
  rejectRequest,
  testEmailNotification,
  testSlackNotification,
};
