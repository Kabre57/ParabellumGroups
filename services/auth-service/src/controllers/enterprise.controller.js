const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { uploadToS3, deleteFromS3, isS3Configured } = require('../utils/s3');

const parseEnterpriseId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseBool = (value) => value === true || value === 'true';

const wouldCreateEnterpriseCycle = async (enterpriseId, candidateParentId) => {
  let currentParentId = candidateParentId;

  while (currentParentId) {
    if (currentParentId === enterpriseId) {
      return true;
    }

    const currentParent = await prisma.enterprise.findUnique({
      where: { id: currentParentId },
      select: { parentEnterpriseId: true },
    });

    currentParentId = currentParent?.parentEnterpriseId || null;
  }

  return false;
};

/**
 * Get all enterprises
 * GET /api/enterprises
 */
const getAllEnterprises = async (req, res) => {
  try {
    const where = {};

    if (req.query.isActive !== undefined) {
      where.isActive = parseBool(req.query.isActive);
    }

    const enterprises = await prisma.enterprise.findMany({
      where,
      include: {
        parentEnterprise: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        childEnterprises: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { users: true, services: true, childEnterprises: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: enterprises,
    });
  } catch (error) {
    console.error('Get all enterprises error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching enterprises',
      errors: error.message,
    });
  }
};

/**
 * Get enterprise by ID
 * GET /api/enterprises/:id
 */
const getEnterpriseById = async (req, res) => {
  try {
    const { id } = req.params;

    const enterprise = await prisma.enterprise.findUnique({
      where: { id: parseInt(id) },
      include: {
        parentEnterprise: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },
        childEnterprises: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            logoUrl: true,
          },
          orderBy: { name: 'asc' },
        },
        services: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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

    return res.status(200).json({
      success: true,
      data: enterprise,
    });
  } catch (error) {
    console.error('Get enterprise by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching enterprise',
      errors: error.message,
    });
  }
};

/**
 * Create new enterprise
 * POST /api/enterprises
 */
const createEnterprise = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, description, code, isActive, parentEnterpriseId } = req.body;
    const normalizedParentEnterpriseId = parseEnterpriseId(parentEnterpriseId);

    let logoUrl = null;
    if (req.file && isS3Configured()) {
      logoUrl = await uploadToS3(req.file.buffer, req.file.mimetype, 'enterprises');
    }

    // Check if enterprise with same name exists
    const existingEnterprise = await prisma.enterprise.findUnique({
      where: { name },
    });

    if (existingEnterprise) {
      if (req.file && isS3Configured() && logoUrl) {
         await deleteFromS3(logoUrl);
      }
      return res.status(409).json({
        success: false,
        message: 'Enterprise with this name already exists',
      });
    }

    // Check if code is unique if provided
    if (code) {
      const codeExists = await prisma.enterprise.findUnique({
        where: { code },
      });

      if (codeExists) {
        if (req.file && isS3Configured() && logoUrl) {
           await deleteFromS3(logoUrl);
        }
        return res.status(409).json({
          success: false,
          message: 'Enterprise code already exists',
        });
      }
    }

    if (normalizedParentEnterpriseId) {
      const parentEnterprise = await prisma.enterprise.findUnique({
        where: { id: normalizedParentEnterpriseId },
        select: { id: true, name: true },
      });

      if (!parentEnterprise) {
        if (req.file && isS3Configured() && logoUrl) {
          await deleteFromS3(logoUrl);
        }
        return res.status(404).json({
          success: false,
          message: 'Parent enterprise not found',
        });
      }
    }

    // Create enterprise
    const enterprise = await prisma.enterprise.create({
      data: {
        name,
        description: description || null,
        code: code || null,
        isActive: isActive !== undefined ? parseBool(isActive) : true,
        parentEnterpriseId: normalizedParentEnterpriseId,
        logoUrl,
      },
      include: {
        parentEnterprise: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ENTERPRISE_CREATED',
        entityType: 'Enterprise',
        entityId: enterprise.id.toString(),
        details: `Enterprise ${enterprise.name} created`,
        newValue: JSON.stringify(enterprise),
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Enterprise created successfully',
      data: enterprise,
    });
  } catch (error) {
    console.error('Create enterprise error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating enterprise',
      errors: error.message,
    });
  }
};

/**
 * Update enterprise
 * PUT /api/enterprises/:id
 */
const updateEnterprise = async (req, res) => {
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
    const { name, description, code, isActive, removeLogo, parentEnterpriseId } = req.body;

    // Check if enterprise exists
    const existingEnterprise = await prisma.enterprise.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEnterprise) {
      return res.status(404).json({
        success: false,
        message: 'Enterprise not found',
      });
    }

    const normalizedParentEnterpriseId =
      parentEnterpriseId === undefined
        ? existingEnterprise.parentEnterpriseId ?? null
        : parseEnterpriseId(parentEnterpriseId);

    let logoUrl = existingEnterprise.logoUrl;
    if (req.file && isS3Configured()) {
      if (existingEnterprise.logoUrl) {
        await deleteFromS3(existingEnterprise.logoUrl);
      }
      logoUrl = await uploadToS3(req.file.buffer, req.file.mimetype, 'enterprises');
    } else if (removeLogo === true || removeLogo === 'true') {
      if (existingEnterprise.logoUrl && isS3Configured()) {
        await deleteFromS3(existingEnterprise.logoUrl);
      }
      logoUrl = null;
    }

    // If name is being updated, check for duplicates
    if (name && name !== existingEnterprise.name) {
      const nameExists = await prisma.enterprise.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(409).json({
          success: false,
          message: 'Enterprise name already in use',
        });
      }
    }

    // If code is being updated, check for duplicates
    if (code && code !== existingEnterprise.code) {
      const codeExists = await prisma.enterprise.findUnique({
        where: { code },
      });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: 'Enterprise code already in use',
        });
      }
    }

    if (parentEnterpriseId !== undefined) {
      if (normalizedParentEnterpriseId === existingEnterprise.id) {
        return res.status(400).json({
          success: false,
          message: 'An enterprise cannot be its own parent',
        });
      }

      if (normalizedParentEnterpriseId) {
        const parentEnterprise = await prisma.enterprise.findUnique({
          where: { id: normalizedParentEnterpriseId },
          select: {
            id: true,
          },
        });

        if (!parentEnterprise) {
          return res.status(404).json({
            success: false,
            message: 'Parent enterprise not found',
          });
        }

        if (await wouldCreateEnterpriseCycle(existingEnterprise.id, normalizedParentEnterpriseId)) {
          return res.status(400).json({
            success: false,
            message: 'Circular enterprise hierarchy is not allowed',
          });
        }
      }
    }

    // Update enterprise
    const updatedEnterprise = await prisma.enterprise.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingEnterprise.name,
        description: description !== undefined ? description : existingEnterprise.description,
        code: code !== undefined ? code : existingEnterprise.code,
        isActive: isActive !== undefined ? parseBool(isActive) : existingEnterprise.isActive,
        parentEnterpriseId: normalizedParentEnterpriseId,
        logoUrl: logoUrl !== undefined ? logoUrl : existingEnterprise.logoUrl,
      },
      include: {
        parentEnterprise: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ENTERPRISE_UPDATED',
        entityType: 'Enterprise',
        entityId: id,
        details: `Enterprise ${updatedEnterprise.name} updated`,
        oldValue: JSON.stringify(existingEnterprise),
        newValue: JSON.stringify(updatedEnterprise),
        level: 'INFO',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Enterprise updated successfully',
      data: updatedEnterprise,
    });
  } catch (error) {
    console.error('Update enterprise error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating enterprise',
      errors: error.message,
    });
  }
};

const deleteEnterprise = require('./enterprise-deletion.controller');

module.exports = {
  getAllEnterprises,
  getEnterpriseById,
  createEnterprise,
  updateEnterprise,
  deleteEnterprise,
};
