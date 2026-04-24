const { validationResult } = require('express-validator');
const prisma = require('../config/database');

const parseBool = (value) => value === true || value === 'true';
const parseNum = (value) =>
  value !== undefined && value !== null && value !== '' && !Number.isNaN(parseInt(value, 10))
    ? parseInt(value, 10)
    : null;

const attachEnterpriseContext = (service) => ({
  ...service,
  enterprise: service.enterprise || null,
});

/**
 * Get all services
 * GET /api/services
 */
const getAllServices = async (req, res) => {
  try {
    const whereClause = req.user.enterpriseId 
      ? { enterpriseId: req.user.enterpriseId } 
      : {};

    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        enterprise: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: services.map(attachEnterpriseContext),
    });
  } catch (error) {
    console.error('Get all services error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching services',
      errors: error.message,
    });
  }
};

/**
 * Get service by ID
 * GET /api/services/:id
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const whereClause = { id: parseInt(id) };
    if (req.user.enterpriseId) {
      whereClause.enterpriseId = req.user.enterpriseId;
    }

    const service = await prisma.service.findFirst({
      where: whereClause,
      include: {
        enterprise: {
          select: { id: true, name: true, logoUrl: true },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        members: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roleId: true,
            isActive: true,
            position: true,
            role: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: attachEnterpriseContext(service),
    });
  } catch (error) {
    console.error('Get service by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching service',
      errors: error.message,
    });
  }
};

/**
 * Create new service
 * POST /api/services
 */
const createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, description, code, parentId, managerId, enterpriseId, isActive } = req.body;

    // Enforce tenant isolation if user belongs to an enterprise
    const finalEnterpriseId = req.user.enterpriseId || parseNum(enterpriseId);

    if (!finalEnterpriseId) {
      return res.status(400).json({
        success: false,
        message: 'Enterprise ID is required to create a service',
      });
    }

    // Check if service with same name exists in this enterprise
    const existingService = await prisma.service.findFirst({
      where: { name, enterpriseId: finalEnterpriseId },
    });

    if (existingService) {
      return res.status(409).json({
        success: false,
        message: 'Service with this name already exists',
      });
    }

    // Check if code is unique if provided
    if (code) {
      const codeExists = await prisma.service.findFirst({
        where: { code, enterpriseId: finalEnterpriseId },
      });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: 'Service code already exists',
        });
      }
    }

    // Create service
    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        code: code || null,
        parentId: parseNum(parentId),
        managerId: parseNum(managerId),
        enterpriseId: finalEnterpriseId,
        isActive: isActive !== undefined ? parseBool(isActive) : true,
      },
      include: {
        enterprise: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SERVICE_CREATED',
        entityType: 'Service',
        entityId: service.id.toString(),
        details: `Service ${service.name} created`,
        newValue: JSON.stringify(service),
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: attachEnterpriseContext(service),
    });
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating service',
      errors: error.message,
    });
  }
};

/**
 * Update service
 * PUT /api/services/:id
 */
const updateService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, description, code, parentId, enterpriseId, managerId, isActive } = req.body;

    const whereClause = { id: parseInt(id) };
    if (req.user.enterpriseId) {
      whereClause.enterpriseId = req.user.enterpriseId;
    }

    // Check if service exists
    const existingService = await prisma.service.findFirst({
      where: whereClause,
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    const requestedEnterpriseId = parseNum(enterpriseId);
    const finalEnterpriseId = req.user.enterpriseId || requestedEnterpriseId || existingService.enterpriseId;

    // If name is being updated, check for duplicates
    if (name && name !== existingService.name) {
      const nameExists = await prisma.service.findFirst({
        where: { name, enterpriseId: finalEnterpriseId },
      });

      if (nameExists) {
        return res.status(409).json({
          success: false,
          message: 'Service name already in use',
        });
      }
    }

    // If code is being updated, check for duplicates
    if (code && code !== existingService.code) {
      const codeExists = await prisma.service.findFirst({
        where: { code, enterpriseId: finalEnterpriseId },
      });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: 'Service code already in use',
        });
      }
    }

    // Update service
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingService.name,
        description: description !== undefined ? description : existingService.description,
        code: code !== undefined ? code : existingService.code,
        parentId: parentId !== undefined ? parseNum(parentId) : existingService.parentId,
        managerId: managerId !== undefined ? parseNum(managerId) : existingService.managerId,
        enterpriseId: finalEnterpriseId,
        isActive: isActive !== undefined ? parseBool(isActive) : existingService.isActive,
      },
      include: {
        enterprise: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SERVICE_UPDATED',
        entityType: 'Service',
        entityId: id,
        details: `Service ${updatedService.name} updated`,
        oldValue: JSON.stringify(existingService),
        newValue: JSON.stringify(updatedService),
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: attachEnterpriseContext(updatedService),
    });
  } catch (error) {
    console.error('Update service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating service',
      errors: error.message,
    });
  }
};

/**
 * Delete service
 * DELETE /api/services/:id
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const whereClause = { id: parseInt(id) };
    if (req.user.enterpriseId) {
      whereClause.enterpriseId = req.user.enterpriseId;
    }

    // Check if service exists
    const service = await prisma.service.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Check if service has users
    if (service._count.members > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service with assigned users',
        errors: {
          userCount: service._count.members,
        },
      });
    }

    // Delete service
    await prisma.service.delete({
      where: { id: parseInt(id) },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SERVICE_DELETED',
        entityType: 'Service',
        entityId: id,
        details: `Service ${service.name} deleted`,
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting service',
      errors: error.message,
    });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
