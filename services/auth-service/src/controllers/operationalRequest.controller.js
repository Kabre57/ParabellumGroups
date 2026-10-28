const prisma = require('../config/database');
const { getUserPermissionNames } = require('../utils/permissions');

const isAdmin = (user) => ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPERADMIN'].includes(String(user?.role?.code || '').toUpperCase());

const getAccessibleEnterpriseIds = (enterprises, user) => {
  if (isAdmin(user)) return new Set(enterprises.filter((item) => item.isActive).map((item) => item.id));
  if (user.enterpriseId == null) return new Set();
  const children = new Map();
  for (const enterprise of enterprises) {
    if (!enterprise.parentEnterpriseId) continue;
    if (!children.has(enterprise.parentEnterpriseId)) children.set(enterprise.parentEnterpriseId, []);
    children.get(enterprise.parentEnterpriseId).push(enterprise.id);
  }
  const visited = new Set();
  const visit = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const child of children.get(id) || []) visit(child);
  };
  visit(user.enterpriseId);
  return new Set(enterprises.filter((item) => item.isActive && visited.has(item.id)).map((item) => item.id));
};

exports.getOperationalRequestRecipients = async (req, res) => {
  try {
    const enterpriseId = Number(req.query.enterpriseId);
    const permission = String(req.query.permission || '');
    if (!Number.isInteger(enterpriseId) || enterpriseId <= 0) return res.status(400).json({ success: false, message: 'Entreprise invalide.' });
    if (!['operational_requests.approve', 'operational_requests.finance'].includes(permission)) return res.status(400).json({ success: false, message: 'Permission de destinataire invalide.' });

    const callerPermissions = await getUserPermissionNames(req.user.id);
    const callerRole = String(req.user.role?.code || '').toUpperCase();
    const canAsk = ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPERADMIN'].includes(callerRole) ||
      callerPermissions.some((name) => ['operational_requests.submit', 'operational_requests.approve', 'operational_requests.finance', '*'].includes(name));
    if (!canAsk) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const enterprises = await prisma.enterprise.findMany({ select: { id: true, parentEnterpriseId: true, isActive: true } });
    const callerScope = getAccessibleEnterpriseIds(enterprises, req.user);
    if (!callerScope.has(enterpriseId)) return res.status(403).json({ success: false, message: 'Entreprise hors périmètre.' });
    const target = enterprises.find((item) => item.id === enterpriseId && item.isActive);
    if (!target) return res.status(404).json({ success: false, message: 'Entreprise introuvable ou inactive.' });

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        enterpriseId: true,
        role: { select: { code: true, rolePermissions: { select: { permission: { select: { name: true } }, canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true } } } },
        user_permissions: { select: { permissions: { select: { name: true } }, can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true } },
      },
    });

    const isTargetWithinUserScope = (user) => {
      if (['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPERADMIN'].includes(String(user.role?.code || '').toUpperCase())) return true;
      if (user.enterpriseId == null) return false;
      let current = target;
      const visited = new Set();
      while (current && !visited.has(current.id)) {
        if (current.id === user.enterpriseId) return true;
        visited.add(current.id);
        current = enterprises.find((item) => item.id === current.parentEnterpriseId);
      }
      return false;
    };

    const data = users.filter((user) => {
      if (['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPERADMIN'].includes(String(user.role?.code || '').toUpperCase())) return false;
      if (String(user.id) === String(req.user.id) || !isTargetWithinUserScope(user)) return false;
      const roleHasPermission = (user.role?.rolePermissions || []).some((item) =>
        item.permission?.name === permission && (item.canView || item.canCreate || item.canEdit || item.canDelete || item.canApprove)
      );
      const userHasPermission = (user.user_permissions || []).some((item) =>
        item.permissions?.name === permission && (item.can_view || item.can_create || item.can_edit || item.can_delete || item.can_approve)
      );
      return roleHasPermission || userHasPermission;
    }).map((user) => ({ id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Operational request recipient lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Impossible de trouver les intervenants autorisés.' });
  }
};
