const { fail } = require('../utils/helpers');
const { resolveActiveEnterprise } = require('../middleware/auth');

const createTypeConfigController = (prisma) => {
  const listTypes = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const enterpriseId = Number(enterprise.id);
      const includeInactive = req.query.all === 'true';

      const types = await prisma.operationalRequestTypeConfig.findMany({
        where: {
          enterpriseId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { label: 'asc' },
      });

      return res.json({ success: true, data: types });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de récupérer les types de demande.');
    }
  };

  const createType = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const enterpriseId = Number(enterprise.id);
      const { code, label, description } = req.body || {};

      const trimmedLabel = String(label || '').trim();
      if (!trimmedLabel) {
        return fail(res, 400, 'Le libellé du type de demande est obligatoire.');
      }

      const generatedCode = String(code || trimmedLabel)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '_')
        .slice(0, 50);

      const existing = await prisma.operationalRequestTypeConfig.findUnique({
        where: {
          enterpriseId_code: {
            enterpriseId,
            code: generatedCode,
          },
        },
      });

      if (existing) {
        return fail(res, 409, 'Un type de demande avec ce code existe déjà.');
      }

      const typeConfig = await prisma.operationalRequestTypeConfig.create({
        data: {
          enterpriseId,
          code: generatedCode,
          label: trimmedLabel,
          description: description ? String(description).trim() : null,
          isActive: true,
        },
      });

      return res.status(201).json({ success: true, data: typeConfig });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de créer le type de demande.');
    }
  };

  const updateType = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const enterpriseId = Number(enterprise.id);
      const { id } = req.params;
      const { label, description, isActive } = req.body || {};

      const existing = await prisma.operationalRequestTypeConfig.findFirst({
        where: { id, enterpriseId },
      });

      if (!existing) {
        return fail(res, 404, 'Type de demande introuvable.');
      }

      const updateData = {};
      if (label !== undefined) {
        const trimmedLabel = String(label).trim();
        if (!trimmedLabel) return fail(res, 400, 'Le libellé ne peut pas être vide.');
        updateData.label = trimmedLabel;
      }
      if (description !== undefined) {
        updateData.description = description ? String(description).trim() : null;
      }
      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const updated = await prisma.operationalRequestTypeConfig.update({
        where: { id: existing.id },
        data: updateData,
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de mettre à jour le type de demande.');
    }
  };

  const deleteType = async (req, res) => {
    try {
      const enterprise = await resolveActiveEnterprise(req);
      const enterpriseId = Number(enterprise.id);
      const { id } = req.params;

      const existing = await prisma.operationalRequestTypeConfig.findFirst({
        where: { id, enterpriseId },
      });

      if (!existing) {
        return fail(res, 404, 'Type de demande introuvable.');
      }

      // Check if any operational request is using this type
      const usageCount = await prisma.operationalRequest.count({
        where: {
          enterpriseId,
          type: existing.code,
        },
      });

      if (usageCount > 0) {
        // Soft delete / disable if used
        const deactivated = await prisma.operationalRequestTypeConfig.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
        return res.json({
          success: true,
          message: 'Ce type est déjà utilisé par des demandes existantes. Il a été désactivé.',
          data: deactivated,
        });
      }

      await prisma.operationalRequestTypeConfig.delete({
        where: { id: existing.id },
      });

      return res.json({ success: true, message: 'Type de demande supprimé.' });
    } catch (error) {
      return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Impossible de supprimer le type de demande.');
    }
  };

  return {
    listTypes,
    createType,
    updateType,
    deleteType,
  };
};

module.exports = {
  createTypeConfigController,
};
