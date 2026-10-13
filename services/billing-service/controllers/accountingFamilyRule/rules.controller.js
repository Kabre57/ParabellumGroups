// Gestion des règles comptables.
const { ensureAccountingRulesWriteAccess, assertEnterpriseInScope, prisma, ensureDefaultFamilyDefinitions, serializeFamilyRuleItem, resolveRuleEnterpriseId, refreshCache, validateFamilyAndAccount } = require('./shared');

exports.addFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les règles de familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    await ensureDefaultFamilyDefinitions(prisma);
    const enterpriseId = await resolveRuleEnterpriseId(req, req.body?.enterpriseId);
    const validation = await validateFamilyAndAccount(req.params.family, req.body?.accountId, enterpriseId);
    if (validation.error) {
      return res.status(validation.error.status).json({
        success: false,
        message: validation.error.message,
      });
    }

    const { family, definition, account } = validation;
    const nextLabel = String(req.body?.label || '').trim() || definition.label;
    const nextDescription =
      typeof req.body?.description === 'undefined'
        ? definition.description || null
        : String(req.body.description || '').trim() || null;

    const requestedPrimary = Boolean(req.body?.isPrimary);

    const createdRule = await prisma.$transaction(async (tx) => {
      const existingFamilyRules = await tx.accountingFamilyRule.findMany({
        where: { family, enterpriseId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });

      const duplicate = existingFamilyRules.find((rule) => rule.accountId === account.id);
      if (duplicate) {
        const error = new Error('Ce compte est déjà rattaché à cette famille');
        error.statusCode = 409;
        throw error;
      }

      const shouldBePrimary = existingFamilyRules.length === 0 || requestedPrimary;

      if (shouldBePrimary) {
        await tx.accountingFamilyRule.updateMany({
          where: { family, enterpriseId },
          data: { isPrimary: false },
        });
      }

      return tx.accountingFamilyRule.create({
        data: {
          family,
          label: nextLabel,
          description: nextDescription,
          accountId: account.id,
          isPrimary: shouldBePrimary,
          enterpriseId,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
        include: { account: true },
      });
    });

    await refreshCache(enterpriseId);

    return res.status(201).json({
      success: true,
      message: 'Compte ajouté à la famille comptable',
      data: serializeFamilyRuleItem(
        await prisma.accountingFamilyRule.findUnique({
          where: { id: createdRule.id },
          include: { account: true },
        })
      ),
    });
  } catch (error) {
    console.error('Erreur ajout règle comptable par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de l ajout de la règle comptable',
    });
  }
};

exports.updateFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les règles de familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const existingRule = await prisma.accountingFamilyRule.findUnique({
      where: { id: String(req.params.ruleId) },
      include: { account: true },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Règle comptable introuvable',
      });
    }

    await assertEnterpriseInScope(
      req,
      existingRule.enterpriseId,
      "Vous n'avez pas acces a cette règle comptable."
    );

    const nextLabel = String(req.body?.label || '').trim() || existingRule.label;
    const nextDescription =
      typeof req.body?.description === 'undefined'
        ? existingRule.description || null
        : String(req.body.description || '').trim() || null;
    const nextIsPrimary = req.body?.isPrimary === true;
    const shouldPromotePrimary = nextIsPrimary && !existingRule.isPrimary;

    const updatedRule = await prisma.$transaction(async (tx) => {
      if (shouldPromotePrimary) {
        await tx.accountingFamilyRule.updateMany({
          where: {
            family: existingRule.family,
            enterpriseId: existingRule.enterpriseId,
            id: { not: existingRule.id },
          },
          data: { isPrimary: false },
        });
      }

      return tx.accountingFamilyRule.update({
        where: { id: existingRule.id },
        data: {
          label: nextLabel,
          description: nextDescription,
          isPrimary: shouldPromotePrimary ? true : existingRule.isPrimary,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
        include: { account: true },
      });
    });

    await refreshCache(existingRule.enterpriseId);

    return res.json({
      success: true,
      message: 'Règle comptable mise à jour',
      data: serializeFamilyRuleItem(updatedRule),
    });
  } catch (error) {
    console.error('Erreur mise à jour règle comptable par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la mise à jour de la règle comptable',
    });
  }
};

exports.deleteFamilyRule = async (req, res) => {
  try {
    const accessError = ensureAccountingRulesWriteAccess(
      req,
      'Vous n avez pas la permission de modifier les règles de familles comptables'
    );
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const existingRule = await prisma.accountingFamilyRule.findUnique({
      where: { id: String(req.params.ruleId) },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Règle comptable introuvable',
      });
    }

    await assertEnterpriseInScope(
      req,
      existingRule.enterpriseId,
      "Vous n'avez pas acces a cette règle comptable."
    );

    await prisma.$transaction(async (tx) => {
      await tx.accountingFamilyRule.delete({
        where: { id: existingRule.id },
      });

      if (existingRule.isPrimary) {
        const nextRule = await tx.accountingFamilyRule.findFirst({
          where: {
            family: existingRule.family,
            enterpriseId: existingRule.enterpriseId,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
        if (nextRule) {
          await tx.accountingFamilyRule.updateMany({
            where: {
              family: existingRule.family,
              enterpriseId: existingRule.enterpriseId,
            },
            data: { isPrimary: false },
          });
          await tx.accountingFamilyRule.update({
            where: { id: nextRule.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    await refreshCache(existingRule.enterpriseId);

    return res.json({
      success: true,
      message: 'Compte retiré de la famille comptable',
    });
  } catch (error) {
    console.error('Erreur suppression règle comptable par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la suppression de la règle comptable',
    });
  }
};
