const ADMIN_ROLES = new Set(['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR']);

const normalizeRole = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role.toUpperCase();
  if (typeof role === 'object') {
    const roleValue = role.code || role.name || role.value || role.role;
    return typeof roleValue === 'string' ? roleValue.toUpperCase() : '';
  }
  return '';
};

const isAdminUser = (req) => ADMIN_ROLES.has(normalizeRole(req?.user?.role));

const isForceDelete = (req) => isAdminUser(req) && String(req?.query?.force).toLowerCase() === 'true';

module.exports = {
  isAdminUser,
  isForceDelete,
};
