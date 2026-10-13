// Gestion des familles comptables.
const { ensureAccountingRulesWriteAccess, loadAccountingFamilyRules, normalizeFamilyCode, prisma, normalizeDisplayType, accountTypeFromPayload, serializeFamilyGroup, resolveRuleEnterpriseId, refreshCache } = require('./shared');

exports.createFamily = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const requestedCode = normalizeFamilyCode(req.body?.code);
    let code = requestedCode;
    const label = String(req.body?.label || '').trim();
    const displayType = normalizeDisplayType(req.body?.displayType || req.body?.type);
    const accountType = accountTypeFromPayload({ ...req.body, displayType });

    if (!code || !label || !accountType) {
      return res.status(400).json({
        success: false,
        message: 'Le code, l intitulé et le type de famille sont obligatoires.',
      });
    }

    const enterpriseId = await resolveRuleEnterpriseId(req, req.body?.enterpriseId);
    if (!enterpriseId) {
      return res.status(400).json({
        success: false,
        message: 'Sélectionnez une entreprise active avant de créer une famille comptable.',
      });
    }

    // Family definition codes are still globally unique for the existing
    // family-rule foreign key. Give a custom family a tenant-specific internal
    // code if another enterprise already owns the requested code.
    const existingCode = await prisma.accountingFamilyDefinition.findUnique({ where: { code } });
    if (existingCode) {
      if (existingCode.enterpriseId === enterpriseId) {
        return res.status(409).json({
          success: false,
          message: 'Ce code famille existe déjà dans cette entreprise.',
        });
      }
      if (existingCode.isSystem) {
        return res.status(409).json({
          success: false,
          message: 'Ce code est réservé à une famille système.',
        });
      }

      const tenantCodeBase = `${requestedCode}_E${enterpriseId}`;
      code = tenantCodeBase;
      let suffix = 1;
      while (await prisma.accountingFamilyDefinition.findUnique({ where: { code } })) {
        code = `${tenantCodeBase}_${suffix++}`;
      }
    }

    const maxSort = await prisma.accountingFamilyDefinition.aggregate({
      where: { enterpriseId },
      _max: { sortOrder: true },
    });

    const created = await prisma.accountingFamilyDefinition.create({
      data: {
        code,
        enterpriseId,
        label,
        description: String(req.body?.description || '').trim() || null,
        displayType,
        accountType,
        isSystem: false,
        sortOrder: Number(maxSort._max.sortOrder || 100) + 10,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
    });

    await refreshCache(enterpriseId);

    return res.status(201).json({
      success: true,
      message: 'Famille comptable créée',
      data: serializeFamilyGroup(created, []),
    });
  } catch (error) {
    console.error('Erreur création famille comptable:', error.message);
    return res.status(error.code === 'P2002' ? 409 : 500).json({
      success: false,
      message: error.code === 'P2002' ? 'Ce code famille existe déjà' : 'Erreur lors de la création de la famille comptable',
    });
  }
};

exports.updateFamily = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const enterpriseId = await resolveRuleEnterpriseId(req, req.body?.enterpriseId);
    if (!enterpriseId) {
      return res.status(400).json({ success: false, message: 'Sélectionnez une entreprise active.' });
    }
    const code = normalizeFamilyCode(req.params.family);
    const existing = await prisma.accountingFamilyDefinition.findFirst({
      where: {
        code,
        OR: [
          { enterpriseId },
          { enterpriseId: null, isSystem: true },
        ],
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Famille comptable introuvable',
      });
    }

    if (existing.isSystem && existing.enterpriseId === null) {
      return res.status(400).json({
        success: false,
        message: 'Une famille système est partagée. Ses comptes associés se configurent séparément pour chaque entreprise.',
      });
    }

    const nextAccountType =
      req.body?.accountType || req.body?.expectedType || req.body?.displayType || req.body?.type
        ? accountTypeFromPayload(req.body)
        : existing.accountType;

    if (!nextAccountType) {
      return res.status(400).json({
        success: false,
        message: 'Type comptable invalide.',
      });
    }

    if (nextAccountType !== existing.accountType) {
      const incompatibleRule = await prisma.accountingFamilyRule.findFirst({
        where: {
          family: code,
          enterpriseId,
          account: {
            type: { not: nextAccountType },
          },
        },
        include: { account: true },
      });

      if (incompatibleRule) {
        return res.status(400).json({
          success: false,
          message: `Impossible de changer le type: le compte ${incompatibleRule.account.code} est déjà rattaché et incompatible.`,
        });
      }
    }

    const updated = await prisma.accountingFamilyDefinition.update({
      where: { code },
      data: {
        label: req.body?.label !== undefined ? String(req.body.label || '').trim() || existing.label : existing.label,
        description:
          req.body?.description !== undefined
            ? String(req.body.description || '').trim() || null
            : existing.description,
        displayType:
          req.body?.displayType !== undefined || req.body?.type !== undefined
            ? normalizeDisplayType(req.body.displayType || req.body.type, existing.displayType)
            : existing.displayType,
        accountType: nextAccountType,
        sortOrder:
          req.body?.sortOrder !== undefined && Number.isFinite(Number(req.body.sortOrder))
            ? Number(req.body.sortOrder)
            : existing.sortOrder,
        createdByUserId: req.user?.userId ? String(req.user.userId) : existing.createdByUserId,
        createdByEmail: req.user?.email || existing.createdByEmail,
      },
    });

    const configuredRules = await loadAccountingFamilyRules(prisma, { enterpriseId, force: true });
    await refreshCache(enterpriseId);

    return res.json({
      success: true,
      message: 'Famille comptable mise à jour',
      data: serializeFamilyGroup(updated, configuredRules.get(updated.code) || []),
    });
  } catch (error) {
    console.error('Erreur mise à jour famille comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la famille comptable',
    });
  }
};

exports.deleteFamily = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const enterpriseId = await resolveRuleEnterpriseId(req);
    if (!enterpriseId) {
      return res.status(400).json({ success: false, message: 'Sélectionnez une entreprise active.' });
    }
    const code = normalizeFamilyCode(req.params.family);
    const existing = await prisma.accountingFamilyDefinition.findFirst({
      where: { code, enterpriseId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Famille comptable introuvable',
      });
    }

    if (existing.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'Une famille système ne peut pas être supprimée.',
      });
    }

    await prisma.accountingFamilyDefinition.delete({
      where: { id: existing.id },
    });

    await refreshCache(enterpriseId);

    return res.json({
      success: true,
      message: 'Famille comptable supprimée',
    });
  } catch (error) {
    console.error('Erreur suppression famille comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la famille comptable',
    });
  }
};
