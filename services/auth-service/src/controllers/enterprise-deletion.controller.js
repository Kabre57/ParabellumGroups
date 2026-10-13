const prisma = require('../config/database');
const { deleteFromS3, isS3Configured } = require('../utils/s3');

const deleteEnterprise = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if enterprise exists
    const enterprise = await prisma.enterprise.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { users: true, services: true, childEnterprises: true },
        },
      },
    });

    if (!enterprise) {
      return res.status(404).json({
        success: false,
        message: 'Enterprise not found',
      });
    }

    // Check if enterprise has users or services
    if (enterprise._count.users > 0 || enterprise._count.services > 0 || enterprise._count.childEnterprises > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete enterprise with assigned users, services or child enterprises',
        errors: {
          userCount: enterprise._count.users,
          serviceCount: enterprise._count.services,
          childEnterpriseCount: enterprise._count.childEnterprises,
        },
      });
    }

    if (enterprise.logoUrl && isS3Configured()) {
      await deleteFromS3(enterprise.logoUrl);
    }

    // Delete enterprise
    await prisma.enterprise.delete({
      where: { id: parseInt(id) },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ENTERPRISE_DELETED',
        entityType: 'Enterprise',
        entityId: id,
        details: `Enterprise ${enterprise.name} deleted`,
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Enterprise deleted successfully',
    });
  } catch (error) {
    console.error('Delete enterprise error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting enterprise',
      errors: error.message,
    });
  }
};

module.exports = deleteEnterprise;
