const requestScope = Symbol('customerEnterpriseScope');

const scopeError = (statusCode, message) => Object.assign(new Error(message), {
  statusCode,
  enterpriseScopeError: true,
});

const parseEnterpriseId = (value) => {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      !/^[1-9]\d*$/.test(String(value))) {
    throw scopeError(400, 'Identifiant entreprise invalide.');
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw scopeError(400, 'Identifiant entreprise invalide.');
  return id;
};

const isGlobalUser = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  return ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPER_ADMIN', 'SUPERADMIN'].includes(role) ||
    (Array.isArray(user?.permissions) && user.permissions.includes('enterprises.read_all'));
};

const getRequestedEnterpriseId = (req) => {
  const selections = [];
  for (const [source, key] of [
    [req.headers, 'x-enterprise-id'], [req.query, 'enterpriseId'], [req.body, 'enterpriseId'],
  ]) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      selections.push(parseEnterpriseId(source[key]));
    }
  }
  if (new Set(selections).size > 1) {
    throw scopeError(400, 'Les sélections entreprise sont contradictoires.');
  }
  return selections[0];
};

const resolveEnterpriseScope = async (req) => {
  if (req[requestScope]) return req[requestScope];
  // The cache belongs to this request only; never reuse another user's hierarchy.
  req[requestScope] = (async () => {
    const requestedId = getRequestedEnterpriseId(req);
    const globalUser = isGlobalUser(req.user);
    let assignedId;
    if (req.user?.enterpriseId !== null && req.user?.enterpriseId !== undefined) {
      try { assignedId = parseEnterpriseId(req.user.enterpriseId); } catch {
        throw scopeError(403, 'Rattachement entreprise invalide.');
      }
    }
    if (!globalUser && !assignedId) {
      throw scopeError(403, 'Aucun rattachement entreprise autorisé.');
    }
    const enterpriseId = requestedId ?? assignedId;
    if (!enterpriseId) throw scopeError(400, 'Sélectionnez une entreprise active.');

    const token = typeof req.headers?.authorization === 'string'
      ? req.headers.authorization.match(/^Bearer\s+(\S+)$/i)?.[1] : undefined;
    if (!token) throw scopeError(401, 'Authentification requise.');
    const authUrl = String(process.env.AUTH_SERVICE_URL || 'http://auth-service:4001').replace(/\/$/, '');
    let enterprises;
    try {
      const response = await fetch(`${authUrl}/api/enterprises?isActive=true`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Enterprise lookup failed');
      const payload = await response.json();
      if (!Array.isArray(payload?.data)) throw new Error('Invalid enterprise list');
      enterprises = payload.data.filter((item) => item?.isActive === true &&
        Number.isSafeInteger(Number(item.id)) && Number(item.id) > 0);
    } catch {
      throw scopeError(503, 'Impossible de vérifier le périmètre entreprise.');
    }
    const active = new Map(enterprises.map((item) => [Number(item.id), item]));
    const accessible = new Set();
    const visit = (id) => {
      if (accessible.has(id) || !active.has(id)) return;
      accessible.add(id);
      for (const item of enterprises) {
        if (Number(item.parentEnterpriseId) === id) visit(Number(item.id));
      }
    };
    if (globalUser) for (const id of active.keys()) accessible.add(id);
    else visit(assignedId);
    if (!accessible.has(enterpriseId)) {
      throw scopeError(403, 'Cette entreprise ne fait pas partie de votre périmètre.');
    }
    return { enterpriseId };
  })();
  return req[requestScope];
};

const respondScopeError = (res, error) => {
  if (!error?.enterpriseScopeError && error?.code !== 'P2025') return false;
  res.status(error.code === 'P2025' ? 404 : error.statusCode).json({
    success: false,
    error: error.code === 'P2025' ? 'Ressource non trouvée.' : error.message,
  });
  return true;
};

const importEnterpriseId = (row, enterpriseId) => {
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (['enterpriseid', 'entrepriseid'].includes(normalized) && parseEnterpriseId(value) !== enterpriseId) {
      throw scopeError(403, 'La ligne doit appartenir à l’entreprise active.');
    }
  }
  return enterpriseId;
};

module.exports = { scopeError, parseEnterpriseId, isGlobalUser, getRequestedEnterpriseId, resolveEnterpriseScope, respondScopeError, importEnterpriseId };
