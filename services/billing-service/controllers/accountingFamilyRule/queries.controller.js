// Gestion de la lecture des familles comptables.
const { ensureAccountingReadAccess, loadAccountingFamilyRules, prisma, getFamilyDefinitions, serializeFamilyGroup, serializeFamilyDiagnostic, resolveRuleEnterpriseId } = require('./shared');

exports.getFamilyRules = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const enterpriseId = await resolveRuleEnterpriseId(req, req.query?.enterpriseId);
    const [definitions, configuredRules] = await Promise.all([
      getFamilyDefinitions(prisma, enterpriseId),
      loadAccountingFamilyRules(prisma, { enterpriseId, force: true }),
    ]);

    return res.json({
      success: true,
      data: definitions.map((definition) => serializeFamilyGroup(definition, configuredRules.get(definition.code) || [])),
    });
  } catch (error) {
    console.error('Erreur récupération règles comptables par famille:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la récupération des familles comptables',
    });
  }
};

exports.getFamilyRulesDiagnostic = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const enterpriseId = await resolveRuleEnterpriseId(req, req.query?.enterpriseId);
    const [definitions, configuredRules] = await Promise.all([
      getFamilyDefinitions(prisma, enterpriseId),
      loadAccountingFamilyRules(prisma, { enterpriseId, force: true }),
    ]);
    const diagnostics = definitions.map((definition) =>
      serializeFamilyDiagnostic(definition, configuredRules.get(definition.code) || [])
    );
    const requiredDiagnostics = diagnostics.filter((item) => item.required);
    const missingFamilies = requiredDiagnostics.filter((item) => !item.isConfigured);
    const invalidFamilies = diagnostics.filter((item) => item.invalidRulesCount > 0);

    return res.json({
      success: true,
      data: {
        healthy: missingFamilies.length === 0 && invalidFamilies.length === 0,
        totalFamilies: diagnostics.length,
        configuredFamilies: diagnostics.length - diagnostics.filter((item) => !item.isConfigured).length,
        missingFamilies: missingFamilies.map((item) => item.family),
        invalidFamilies: invalidFamilies.map((item) => item.family),
        families: diagnostics,
      },
    });
  } catch (error) {
    console.error('Erreur diagnostic familles comptables:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors du diagnostic des familles comptables',
    });
  }
};
