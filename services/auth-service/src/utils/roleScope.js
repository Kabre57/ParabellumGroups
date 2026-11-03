const parseEnterpriseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isGlobalAdmin = (user) => (user?.role?.code || user?.roleCode) === 'ADMIN';

const getActiveEnterpriseId = (req) => {
  const selectedEnterpriseId = parseEnterpriseId(
    req.query?.enterpriseId || req.body?.enterpriseId || req.headers['x-enterprise-id']
  );
  if (isGlobalAdmin(req.user)) return selectedEnterpriseId || req.user.enterpriseId || null;
  return req.user.enterpriseId || selectedEnterpriseId || null;
};

const getRoleScopeWhere = (req) => {
  const enterpriseId = getActiveEnterpriseId(req);
  if (!enterpriseId) return { enterpriseId: null };
  return { OR: [{ enterpriseId: null }, { enterpriseId }] };
};

const findRoleInScope = (prisma, req, roleId) => prisma.role.findFirst({
  where: { id: parseEnterpriseId(roleId), ...getRoleScopeWhere(req) },
});

const findRoleByCodeInScope = async (prisma, req, code) => {
  const role = await prisma.role.findUnique({ where: { code } });
  if (!role) return null;
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
