const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { isServiceManager } = require('../utils/serviceManagerScope');
const { generateServiceCode } = require('../utils/generatedCodes');
const {
  syncServiceHierarchy,
  syncServiceManager,
  recordServiceHistory,
} = require('../utils/serviceRelations');

const parseBool = (value) => value === true || value === 'true';
const parseNum = (value) =>
  value !== undefined && value !== null && value !== '' && !Number.isNaN(parseInt(value, 10))
    ? parseInt(value, 10)
    : null;

const isGlobalAdmin = (user) => (user?.role?.code || user?.roleCode) === 'ADMIN';
const canViewGlobalServiceDetails = (user) => isGlobalAdmin(user);

const wouldCreateServiceCycle = async (serviceId, parentId) => {
  let currentId = parentId;
  const visited = new Set();

  while (currentId) {
    if (currentId === serviceId || visited.has(currentId)) return true;
    visited.add(currentId);
    const current = await prisma.serviceHierarchy.findUnique({
      where: { serviceId: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId || null;
  }

  return false;
};

const buildServiceInclude = (memberScope, { includeChildren = false, includeMembers = false } = {}) => ({
  hierarchy: {
    include: {
      parent: { select: { id: true, name: true } },
    },
  },
  ...(includeChildren
    ? { parentOf: { include: { service: { select: { id: true, name: true, code: true } } } } }
    : {}),
  managers: {
    where: { isPrimary: true, endDate: null },
    include: {
      manager: {
        select: { id: true, firstName: true, lastName: true, email: true, enterpriseId: true },
      },
    },
  },
  ...(includeMembers
    ? {
        serviceMembers: {
          where: { endDate: null, ...(memberScope ? { user: memberScope } : {}) },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                roleId: true,
                isActive: true,
                position: true,
                role: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      }
    : {}),
  _count: {
    select: {
      serviceMembers: { where: { endDate: null, ...(memberScope ? { user: memberScope } : {}) } },
    },
  },
});

const mapServiceResponse = (service, req, { includeChildren = false, includeMembers = false } = {}) => {
  const { hierarchy, parentOf, managers, serviceMembers, _count, ...serviceFields } = service;
  const managerAssignment = managers?.[0] || null;
  const manager = managerAssignment?.manager || null;
  const managerIsVisible = canViewGlobalServiceDetails(req.user) || (
    manager?.enterpriseId != null &&
    req.user.enterpriseId != null &&
    Number(manager.enterpriseId) === Number(req.user.enterpriseId)
  );
  const visibleManager = manager && managerIsVisible
    ? (({ enterpriseId, ...details }) => details)(manager)
    : null;

  return {
    ...serviceFields,
    parentId: hierarchy?.parentId ?? null,
    managerId: managerAssignment?.managerId ?? null,
    parent: hierarchy?.parent ?? null,
    ...(includeChildren
      ? { children: (parentOf || []).map(({ service: child }) => child) }
      : {}),
    ...(includeMembers
      ? { members: (serviceMembers || []).map(({ user }) => user) }
      : {}),
    manager: visibleManager,
    _count: { members: _count?.serviceMembers ?? 0 },
  };
};

/**
 * Get all services
 * GET /api/services
 */
const getAllServices = async (req, res) => {
  try {
    const canViewGlobalDetails = canViewGlobalServiceDetails(req.user);
    const memberScope = canViewGlobalDetails ? undefined : { enterpriseId: req.user.enterpriseId ?? -1 };
    const whereClause = req.query.includeInactive === 'true' ? {} : { isActive: true };
    if (isServiceManager(req.user)) {
      whereClause.managers = {
        some: { managerId: Number(req.user.id), isPrimary: true, endDate: null },
      };
      whereClause.isActive = true;
    }

    const services = await prisma.service.findMany({
      where: whereClause,
      include: buildServiceInclude(memberScope),
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: services.map((service) => mapServiceResponse(service, req)),
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
    const canViewGlobalDetails = canViewGlobalServiceDetails(req.user);
    const memberScope = canViewGlobalDetails ? undefined : { enterpriseId: req.user.enterpriseId ?? -1 };

    const whereClause = { id: parseInt(id) };
    if (isServiceManager(req.user)) {
      whereClause.managers = {
        some: { managerId: Number(req.user.id), isPrimary: true, endDate: null },
      };
      whereClause.isActive = true;
    }

    const service = await prisma.service.findFirst({
      where: whereClause,
      include: buildServiceInclude(memberScope, { includeChildren: true, includeMembers: true }),
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: mapServiceResponse(service, req, { includeChildren: true, includeMembers: true }),
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

const getServiceHistory = async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id, 10);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({ success: false, message: 'Identifiant de service invalide.' });
    }

    if (isServiceManager(req.user)) {
      const managedAssignment = await prisma.serviceManager.findFirst({
        where: {
          serviceId,
          managerId: Number(req.user.id),
          isPrimary: true,
          endDate: null,
          service: { isActive: true },
        },
        select: { id: true },
      });
      if (!managedAssignment) {
        return res.status(404).json({ success: false, message: 'Service introuvable dans votre périmètre.' });
      }
    }

    const history = await prisma.serviceHistory.findMany({
      where: { serviceId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Get service history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer l’historique du service.',
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

    const { name, description, parentId, managerId, isActive } = req.body;
    if (!isGlobalAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Seul un administrateur peut créer un service global.' });
    }

    // Service names are unique in the shared system catalog.
    const existingService = await prisma.service.findFirst({
      where: { name },
    });

    if (existingService) {
      return res.status(409).json({
        success: false,
        message: 'Service with this name already exists',
      });
    }

    // Check if code is unique if provided
    const code = req.body.code?.trim() || await generateServiceCode(prisma, name);
    if (req.body.code) {
      const codeExists = await prisma.service.findUnique({ where: { code } });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: 'Service code already exists',
        });
      }
    }

    const requestedParentId = parseNum(parentId);
    const requestedManagerId = parseNum(managerId);

    if (requestedParentId) {
      const parentService = await prisma.service.findUnique({
        where: { id: requestedParentId },
        select: { id: true, isActive: true },
      });
      if (!parentService || !parentService.isActive) {
        return res.status(400).json({ success: false, message: 'Choisissez un service parent actif.' });
      }
    }
    if (requestedManagerId) {
      const manager = await prisma.user.findFirst({
        where: { id: requestedManagerId, isActive: true },
        select: { id: true },
      });
      if (!manager) {
        return res.status(400).json({ success: false, message: 'Choisissez un responsable actif.' });
      }
    }

    // Create service
    const service = await prisma.$transaction(async (tx) => {
      const createdService = await tx.service.create({
        data: {
          name,
          description: description || null,
          code: code || null,
          parentId: requestedParentId,
          managerId: requestedManagerId,
          isActive: isActive !== undefined ? parseBool(isActive) : true,
        },
        include: {
          manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          parent: { select: { id: true, name: true } },
        },
      });
      await syncServiceHierarchy(tx, createdService.id, requestedParentId);
      await syncServiceManager(tx, createdService.id, requestedManagerId);
      await recordServiceHistory(tx, {
        serviceId: createdService.id,
        userId: req.user.id,
        action: 'CREATED',
        description: `Service ${createdService.name} créé`,
        newData: createdService,
      });
      return createdService;
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

    return res.status(201).json({ success: true, message: 'Service created successfully', data: service });
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
    const { name, description, code, parentId, managerId, isActive } = req.body;

    const whereClause = { id: parseInt(id) };

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

    const nextParentId = parentId !== undefined ? parseNum(parentId) : existingService.parentId;
    if (nextParentId) {
      const parentService = await prisma.service.findUnique({
        where: { id: nextParentId },
        select: { id: true, isActive: true },
      });
      if (!parentService || (!parentService.isActive && nextParentId !== existingService.parentId)) {
        return res.status(400).json({ success: false, message: 'Choisissez un service parent actif.' });
      }
      if (await wouldCreateServiceCycle(existingService.id, nextParentId)) {
        return res.status(400).json({ success: false, message: 'Un service ne peut pas avoir un de ses descendants comme parent.' });
      }
    }

    const nextManagerId = managerId !== undefined ? parseNum(managerId) : existingService.managerId;
    if (nextManagerId) {
      const manager = await prisma.user.findFirst({
        where: { id: nextManagerId },
        select: { id: true, isActive: true, enterpriseId: true },
      });
      const managerIsInScope = isGlobalAdmin(req.user) || (
        manager?.enterpriseId != null &&
        req.user.enterpriseId != null &&
        Number(manager.enterpriseId) === Number(req.user.enterpriseId)
      );
      if (
        !manager ||
        (!manager.isActive && nextManagerId !== existingService.managerId) ||
        (!managerIsInScope && nextManagerId !== existingService.managerId)
      ) {
        return res.status(400).json({ success: false, message: 'Le responsable doit être actif et dans votre périmètre.' });
      }
    }

    // If name is being updated, check for duplicates
    const nextName = name || existingService.name;
    if (nextName !== existingService.name) {
      const nameExists = await prisma.service.findFirst({
        where: { name: nextName, NOT: { id: existingService.id } },
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
      const codeExists = await prisma.service.findUnique({ where: { code } });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: 'Service code already in use',
        });
      }
    }

    // Update service
    const updatedService = await prisma.$transaction(async (tx) => {
      const updated = await tx.service.update({
        where: { id: parseInt(id) },
        data: {
          name: nextName,
          description: description !== undefined ? description : existingService.description,
          code: code !== undefined ? code : existingService.code,
          parentId: nextParentId,
          managerId: nextManagerId,
          isActive: isActive !== undefined ? parseBool(isActive) : existingService.isActive,
        },
        include: {
          manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          parent: { select: { id: true, name: true } },
        },
      });
      await syncServiceHierarchy(tx, updated.id, nextParentId);
      await syncServiceManager(tx, updated.id, nextManagerId);
      await recordServiceHistory(tx, {
        serviceId: updated.id,
        userId: req.user.id,
        action: 'UPDATED',
        description: `Service ${updated.name} modifié`,
        oldData: existingService,
        newData: updated,
      });
      return updated;
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

    return res.status(200).json({ success: true, message: 'Service updated successfully', data: updatedService });
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

    // Check if service exists
    const service = await prisma.service.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            serviceMembers: { where: { endDate: null } },
            parentOf: true,
          },
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
    if (service._count.serviceMembers > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service with assigned users',
        errors: {
          userCount: service._count.serviceMembers,
        },
      });
    }

    if (service._count.parentOf > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un service qui possède des services enfants.',
        errors: { childServiceCount: service._count.parentOf },
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
  getServiceHistory,
  createService,
  updateService,
  deleteService,
};
