const parseEnterpriseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isGlobalAdmin = (user) => {
  const roleCode = String(user?.role?.code || user?.roleCode || user?.role || '').toUpperCase();
  return ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPER_ADMIN', 'SUPERADMIN'].includes(roleCode);
};

const getActiveEnterpriseId = (req) => {
  const selectedEnterpriseId = parseEnterpriseId(
    req.query?.enterpriseId || req.body?.enterpriseId || req.headers['x-enterprise-id']
  );
  if (isGlobalAdmin(req.user)) return selectedEnterpriseId || req.user.enterpriseId || null;
  return req.user.enterpriseId || selectedEnterpriseId || null;
};

const getRoleScopeWhere = (req) => {
  // The global admin pages manage the shared role catalogue. An explicit
  // enterpriseId is still honored by assignment forms that need a local list.
  const explicitEnterpriseId = isGlobalAdmin(req.user)
    ? parseEnterpriseId(req.query?.enterpriseId)
    : null;
  if (isGlobalAdmin(req.user) && !explicitEnterpriseId) return {};

  const enterpriseId = explicitEnterpriseId || getActiveEnterpriseId(req);
  if (!enterpriseId) return { enterpriseId: null };
  return { OR: [{ enterpriseId: null }, { enterpriseId }] };
};

const findRoleInScope = (prisma, req, roleId) => prisma.role.findFirst({
  where: { id: parseEnterpriseId(roleId), ...getRoleScopeWhere(req) },
});

const findRoleByCodeInScope = async (prisma, req, code) => {
  const role = await prisma.role.findUnique({ where: { code } });
  if (!role) return null;
  if (isGlobalAdmin(req.user) && !parseEnterpriseId(req.query?.enterpriseId)) return role;
  const enterpriseId = getActiveEnterpriseId(req);
  return role.enterpriseId === null || role.enterpriseId === enterpriseId ? role : null;
};

module.exports = {
  findRoleInScope,
  findRoleByCodeInScope,
  getActiveEnterpriseId,
  getRoleScopeWhere,
  isGlobalAdmin,
};
