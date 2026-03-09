const prisma = require('../config/database');
const { getAuditLogAllowedLevels } = require('../utils/permissions');

/**
 * Get audit logs with permission-based filtering
 * GET /api/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleCode = req.user.role?.code;
    const { page = 1, limit = 50, level, entityType, entityId, action, startDate, endDate } = req.query;

    const allowedLevels = await getAuditLogAllowedLevels(userId, roleCode);

    if (allowedLevels.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas la permission de consulter les journaux d'audit"
      });
    }

    const where = {
      level: { in: allowedLevels }
    };

    if (level && allowedLevels.includes(level)) {
      where.level = level;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des journaux d'audit",
      errors: error.message
    });
  }
};

module.exports = {
  getAuditLogs
};
