const jwt = require('jsonwebtoken');
const {
  getToken,
  fail,
  normalizePermissions,
  isAdmin,
  hasPermission,
} = require('../utils/helpers');

const authenticate = (req, res, next) => {
  const token = getToken(req);
  if (!token) return fail(res, 401, 'Authentification requise.');
  if (!process.env.JWT_SECRET) return fail(res, 503, 'Authentification indisponible.');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'parabellum-auth-service' });
    req.token = token;
    req.user = {
      userId: payload.userId || payload.id,
      id: payload.userId || payload.id,
      email: payload.email || null,
      firstName: payload.firstName || null,
      lastName: payload.lastName || null,
      role: payload.role || payload.roleCode || null,
      roleCode: payload.roleCode || payload.role || null,
      enterpriseId: payload.enterpriseId || null,
      enterpriseName: payload.enterpriseName || null,
      serviceId: payload.serviceId || null,
      serviceName: payload.serviceName || null,
      permissions: normalizePermissions(payload.permissions || payload.permissionsList),
    };
    return next();
  } catch {
    return fail(res, 401, 'Session invalide ou expirée.');
  }
};

const requirePermission = (permission, { explicit = false } = {}) => (req, res, next) => {
  const role = String(req.user?.role || req.user?.roleCode || '').toUpperCase();
  if (explicit && ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPERADMIN'].includes(role)) {
    return fail(res, 403, 'Un administrateur ne peut pas remplacer une décision métier.');
  }
  if (hasPermission(req.user, permission)) return next();
  return fail(res, 403, 'Vous ne disposez pas de la permission nécessaire.');
};

const requireAnyPermission = (...permissions) => (req, res, next) => {
  if (permissions.some((permission) => hasPermission(req.user, permission))) return next();
  return fail(res, 403, 'Vous ne disposez pas de la permission nécessaire.');
};

const ENTERPRISE_CACHE_TTL_MS = 60 * 1000;
let activeEnterprisesCache = {
  url: null,
  expiresAt: 0,
  data: null,
};

const buildFallbackEnterprisesFromUser = (req) => {
  const canReadAll = isAdmin(req.user) || hasPermission(req.user, 'enterprises.read_all');
  const selectedId = Number(req.headers?.['x-enterprise-id']);
  const userEnterpriseId = Number(req.user?.enterpriseId);
  const fallbackMap = new Map();

  if (Number.isInteger(userEnterpriseId) && userEnterpriseId > 0) {
    fallbackMap.set(userEnterpriseId, {
      id: userEnterpriseId,
      name: req.user?.enterpriseName || `Entreprise #${userEnterpriseId}`,
      isActive: true,
      parentEnterpriseId: null,
    });
  }

  if (canReadAll && Number.isInteger(selectedId) && selectedId > 0 && !fallbackMap.has(selectedId)) {
    fallbackMap.set(selectedId, {
      id: selectedId,
      name: `Entreprise #${selectedId}`,
      isActive: true,
      parentEnterpriseId: null,
    });
  }

  return [...fallbackMap.values()];
};

const fetchActiveEnterprisesList = async (req) => {
  const authServiceUrl = String(process.env.AUTH_SERVICE_URL || 'http://localhost:4001').replace(/\/$/, '');
  if (
    activeEnterprisesCache.data &&
    activeEnterprisesCache.url === authServiceUrl &&
    activeEnterprisesCache.expiresAt > Date.now()
  ) {
    return activeEnterprisesCache.data;
  }

  try {
    const response = await fetch(`${authServiceUrl}/api/enterprises?isActive=true`, {
      headers: { Authorization: `Bearer ${req.token}` },
    });
    if (!response.ok) {
      throw Object.assign(new Error('Impossible de vérifier le périmètre entreprise.'), { statusCode: 503 });
    }
    const payload = await response.json();
    const enterprises = Array.isArray(payload?.data)
      ? payload.data.filter((item) => item?.isActive !== false)
      : [];
    activeEnterprisesCache = {
      url: authServiceUrl,
      data: enterprises,
      expiresAt: Date.now() + ENTERPRISE_CACHE_TTL_MS,
    };
    return enterprises;
  } catch (error) {
    if (activeEnterprisesCache.data && activeEnterprisesCache.url === authServiceUrl) {
      return activeEnterprisesCache.data;
    }
    const fallback = buildFallbackEnterprisesFromUser(req);
    if (fallback.length > 0) {
      return fallback;
    }
    if (error?.statusCode) throw error;
    throw Object.assign(new Error('Impossible de vérifier le périmètre entreprise.'), { statusCode: 503 });
  }
};

const fetchAccessibleEnterprises = async (req) => {
  if (req.accessibleEnterprises) return req.accessibleEnterprises;
  const enterprises = await fetchActiveEnterprisesList(req);
  const canReadAll =
    isAdmin(req.user) ||
    hasPermission(req.user, 'enterprises.read_all') ||
    hasPermission(req.user, 'enterprises.read');
  if (canReadAll) {
    req.accessibleEnterprises = enterprises;
    return enterprises;
  }
  if (!req.user?.enterpriseId) {
    req.accessibleEnterprises = [];
    return req.accessibleEnterprises;
  }
  const children = new Map();
  for (const enterprise of enterprises) {
    const parentId = Number(enterprise.parentEnterpriseId);
    if (!Number.isInteger(parentId)) continue;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(enterprise);
  }
  const rootId = Number(req.user.enterpriseId);
  const scope = new Map();
  const visit = (id) => {
    const enterprise = enterprises.find((item) => Number(item.id) === Number(id));
    if (!enterprise || scope.has(Number(id))) return;
    scope.set(Number(id), enterprise);
    for (const child of children.get(Number(id)) || []) visit(child.id);
  };
  visit(rootId);
  req.accessibleEnterprises = [...scope.values()];
  return req.accessibleEnterprises;
};

const resolveActiveEnterprise = async (req) => {
  if (req.activeEnterprise) return req.activeEnterprise;
  const selectedId = Number(req.headers['x-enterprise-id']);
  if (!Number.isInteger(selectedId) || selectedId <= 0) {
    throw Object.assign(new Error('Sélectionnez une entreprise active.'), { statusCode: 400 });
  }
  const enterprises = await fetchAccessibleEnterprises(req);
  const selected = enterprises.find((enterprise) => Number(enterprise.id) === selectedId);
  if (!selected) {
    throw Object.assign(new Error('Cette entreprise ne fait pas partie de votre périmètre.'), { statusCode: 403 });
  }
  req.activeEnterprise = selected;
  return selected;
};

module.exports = {
  authenticate,
  requirePermission,
  requireAnyPermission,
  fetchAccessibleEnterprises,
  resolveActiveEnterprise,
};
