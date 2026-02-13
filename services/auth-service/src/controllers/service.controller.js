const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { uploadToS3, deleteFromS3, isS3Configured } = require('../utils/s3');

/**
 * Get all services
 * GET /api/services
 */
const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
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
      data: services,
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

    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      include: {
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
      data: service,
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

    const { name, description, code, parentId, managerId, isActive } = req.body;

    let imageUrl = null;
    if (req.file && isS3Configured()) {
      imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype, 'services');
    }

    // Check if service with same name exists
    const existingService = await prisma.service.findUnique({
      where: { name },
    });

    if (existingService) {
      return res.status(409).json({
        success: false,
        message: 'Service with this name already exists',
      });
    }

    // Check if code is unique if provided
    if (code) {
      const codeExists = await prisma.service.findUnique({
        where: { code },
      });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: 'Service code already exists',
        });
      }
    }

    const parseBool = (v) => v === true || v === 'true';
    const parseNum = (v) => (v && !Number.isNaN(parseInt(v, 10)) ? parseInt(v, 10) : null);

    // Create service
    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        code: code || null,
        parentId: parseNum(parentId),
        managerId: parseNum(managerId),
        isActive: isActive !== undefined ? parseBool(isActive) : true,
        imageUrl,
      },
      include: {
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
      data: service,
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
    const { name, description, code, parentId, managerId, isActive, removeImage } = req.body;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    let imageUrl = existingService.imageUrl;
    if (req.file && isS3Configured()) {
      if (existingService.imageUrl) {
        await deleteFromS3(existingService.imageUrl);
      }
      imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype, 'services');
    } else if (removeImage === true || removeImage === 'true') {
      if (existingService.imageUrl && isS3Configured()) {
        await deleteFromS3(existingService.imageUrl);
      }
      imageUrl = null;
    }

    const parseBool = (v) => v === true || v === 'true';
    const parseNum = (v) => (v && !Number.isNaN(parseInt(v, 10)) ? parseInt(v, 10) : null);

    // If name is being updated, check for duplicates
    if (name && name !== existingService.name) {
      const nameExists = await prisma.service.findUnique({
        where: { name },
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
      const codeExists = await prisma.service.findUnique({
        where: { code },
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
        isActive: isActive !== undefined ? parseBool(isActive) : existingService.isActive,
        imageUrl: imageUrl !== undefined ? imageUrl : existingService.imageUrl,
      },
      include: {
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
      data: updatedService,
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

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { users: true },
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

    if (service.imageUrl && isS3Configured()) {
      await deleteFromS3(service.imageUrl);
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
