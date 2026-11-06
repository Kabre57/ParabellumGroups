const SCOPE_PROMISE = Symbol('projectEnterpriseScope');
const ADMIN_ROLES = new Set(['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPER_ADMIN', 'SUPERADMIN']);

const accessError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const parseEnterpriseId = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const isGlobalUser = (user) => {
  const role = user?.role?.code || user?.roleCode || user?.role;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : user?.permissionsList || [];
  return ADMIN_ROLES.has(String(role || '').trim().toUpperCase()) ||
    (Array.isArray(permissions) && permissions.some((permission) => String(permission).toLowerCase() === 'enterprises.read_all'));
};

const selectEnterpriseId = (req) => {
  const candidates = [];
  for (const [container, key] of [[req.headers, 'x-enterprise-id'], [req.query, 'enterpriseId'], [req.body, 'enterpriseId']]) {
    if (!container || !Object.prototype.hasOwnProperty.call(container, key)) continue;
    const value = parseEnterpriseId(container[key]);
    if (!value) throw accessError(400, 'Identifiant entreprise invalide.');
    candidates.push(value);
  }
  if (new Set(candidates).size > 1) {
    throw accessError(400, 'Les entreprises sélectionnées dans la requête sont contradictoires.');
  }

  const assignedEnterpriseId = parseEnterpriseId(req.user?.enterpriseId);
  if (!isGlobalUser(req.user) && !assignedEnterpriseId) {
    throw accessError(403, 'Votre compte doit être rattaché à une entreprise.');
  }
  const selectedEnterpriseId = candidates[0] || assignedEnterpriseId;
  if (!selectedEnterpriseId) throw accessError(400, 'Sélectionnez une entreprise.');
  return { selectedEnterpriseId, assignedEnterpriseId };
};

const authorizationHeader = (req) => {
  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) {
    throw accessError(401, 'Authentification requise.');
  }
  return authorization;
};

const fetchEnterpriseList = async (req) => {
  const authorization = authorizationHeader(req);
  const baseUrl = String(process.env.AUTH_SERVICE_URL || 'http://auth-service:4001').replace(/\/$/, '');
  try {
    const response = await fetch(`${baseUrl}/api/enterprises`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Enterprise lookup rejected');
    const payload = await response.json();
    if (!Array.isArray(payload?.data)) throw new Error('Invalid enterprise list');
    return payload.data;
  } catch {
    throw accessError(503, 'Impossible de vérifier le périmètre entreprise. Réessayez ultérieurement.');
  }
};

const resolveScope = async (req) => {
  const { selectedEnterpriseId, assignedEnterpriseId } = selectEnterpriseId(req);
  const enterprises = await fetchEnterpriseList(req);
  const active = enterprises.filter((enterprise) => enterprise.isActive === true && parseEnterpriseId(enterprise.id));
  const activeIds = new Set(active.map((enterprise) => parseEnterpriseId(enterprise.id)));
  if (!activeIds.has(selectedEnterpriseId)) throw accessError(403, 'Entreprise inaccessible.');

  if (!isGlobalUser(req.user)) {
    const accessible = new Set();
    const pending = activeIds.has(assignedEnterpriseId) ? [assignedEnterpriseId] : [];
    while (pending.length) {
      const current = pending.pop();
      if (accessible.has(current)) continue;
      accessible.add(current);
      for (const enterprise of active) {
        if (parseEnterpriseId(enterprise.parentEnterpriseId) === current) pending.push(parseEnterpriseId(enterprise.id));
      }
    }
    if (!accessible.has(selectedEnterpriseId)) throw accessError(403, 'Entreprise hors de votre périmètre.');
  }
  return selectedEnterpriseId;
};

// This cache belongs to one HTTP request. It never shares an enterprise list
// or an authorization decision between users or requests.
const resolveEnterpriseId = (req) => {
  if (!req[SCOPE_PROMISE]) req[SCOPE_PROMISE] = resolveScope(req);
  return req[SCOPE_PROMISE];
};

const projectWhere = async (req, id) => ({
  ...(id === undefined ? {} : { id }),
  enterpriseId: await resolveEnterpriseId(req),
});

const childWhere = async (req, id) => ({
  ...(id === undefined ? {} : { id }),
  projet: { enterpriseId: await resolveEnterpriseId(req) },
});

const assertImmutableReference = (body, fields, expectedValue) => {
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body || {}, field) && body[field] !== expectedValue) {
      throw accessError(400, 'Le rattachement de cette ressource ne peut pas être modifié.');
    }
  }
};

const sendAccessError = (error, res) => {
  if (error.code === 'P2025') {
    res.status(404).json({ error: 'Ressource introuvable dans cette entreprise.' });
    return true;
  }
  if (![400, 401, 403, 404, 503].includes(error.statusCode)) return false;
  res.status(error.statusCode).json({ error: error.message });
  return true;
};

module.exports = {
  accessError, parseEnterpriseId, isGlobalUser, resolveEnterpriseId,
  projectWhere, childWhere, assertImmutableReference, sendAccessError, authorizationHeader,
};
