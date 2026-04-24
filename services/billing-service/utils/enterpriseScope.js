const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
const ENTERPRISE_CACHE_TTL_MS = 60 * 1000;

let enterpriseCache = {
  expiresAt: 0,
  data: null,
};

const parseEnterpriseId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getEnterpriseList = async (req) => {
  if (enterpriseCache.data && enterpriseCache.expiresAt > Date.now()) {
    return enterpriseCache.data;
  }

  const response = await axios.get(`${AUTH_SERVICE_URL}/api/enterprises`, {
    headers: {
      authorization: req.headers.authorization || '',
    },
  });

  const enterprises = Array.isArray(response.data?.data) ? response.data.data : [];
  enterpriseCache = {
    data: enterprises,
    expiresAt: Date.now() + ENTERPRISE_CACHE_TTL_MS,
  };

  return enterprises;
};

const collectDescendants = (childrenByParentId, parentId, bucket) => {
  const children = childrenByParentId.get(parentId) || [];
  children.forEach((childId) => {
    if (bucket.has(childId)) return;
    bucket.add(childId);
    collectDescendants(childrenByParentId, childId, bucket);
  });
};

const computeScopedEnterpriseIds = (enterprises, rootEnterpriseId) => {
  const normalizedRootId = parseEnterpriseId(rootEnterpriseId);
  if (!normalizedRootId) return null;

  const childrenByParentId = new Map();
  enterprises.forEach((enterprise) => {
    const parentId = parseEnterpriseId(enterprise.parentEnterpriseId);
    const enterpriseId = parseEnterpriseId(enterprise.id);
    if (!parentId || !enterpriseId) return;
    if (!childrenByParentId.has(parentId)) {
      childrenByParentId.set(parentId, []);
    }
    childrenByParentId.get(parentId).push(enterpriseId);
  });

  const scopedIds = new Set([normalizedRootId]);
  collectDescendants(childrenByParentId, normalizedRootId, scopedIds);
  return Array.from(scopedIds);
};

const getAccessibleEnterpriseIds = async (req) => {
  const rootEnterpriseId = parseEnterpriseId(req.user?.enterpriseId);
  if (!rootEnterpriseId) return null;

  const enterprises = await getEnterpriseList(req);
  return computeScopedEnterpriseIds(enterprises, rootEnterpriseId) || [rootEnterpriseId];
};

const resolveEnterpriseContext = async (req, requestedEnterpriseId = req.body?.enterpriseId) => {
  const enterprises = await getEnterpriseList(req);
  const scopedIds = await resolveEnterpriseIdsForRequest(req, requestedEnterpriseId);
  const normalizedRequestedEnterpriseId = parseEnterpriseId(requestedEnterpriseId);
  const userEnterpriseId = parseEnterpriseId(req.user?.enterpriseId);
  const targetEnterpriseId =
    normalizedRequestedEnterpriseId ||
    userEnterpriseId ||
    (Array.isArray(scopedIds) && scopedIds.length > 0 ? scopedIds[0] : null);

  if (!targetEnterpriseId) {
    return {
      enterpriseId: null,
      enterpriseName: null,
    };
  }

  if (Array.isArray(scopedIds) && scopedIds.length > 0 && !scopedIds.includes(targetEnterpriseId)) {
    const error = new Error("Vous n'avez pas acces a cette entreprise.");
    error.statusCode = 403;
    throw error;
  }

  const targetEnterprise = enterprises.find(
    (enterprise) => parseEnterpriseId(enterprise.id) === targetEnterpriseId
  );

  return {
    enterpriseId: targetEnterpriseId,
    enterpriseName:
      targetEnterprise?.name ||
      (userEnterpriseId === targetEnterpriseId ? req.user?.enterpriseName || null : null),
  };
};

const resolveEnterpriseIdsForRequest = async (req, requestedEnterpriseId = req.query?.enterpriseId) => {
  const scopedIds = await getAccessibleEnterpriseIds(req);
  const normalizedRequestedEnterpriseId = parseEnterpriseId(requestedEnterpriseId);

  if (!scopedIds) {
    return normalizedRequestedEnterpriseId ? [normalizedRequestedEnterpriseId] : null;
  }

  if (!normalizedRequestedEnterpriseId) {
    return scopedIds;
  }

  if (!scopedIds.includes(normalizedRequestedEnterpriseId)) {
    const error = new Error("Vous n'avez pas acces a cette entreprise.");
    error.statusCode = 403;
    throw error;
  }

  return [normalizedRequestedEnterpriseId];
};

const applyEnterpriseScope = async ({
  req,
  where = {},
  field = 'enterpriseId',
  requestedEnterpriseId = req.query?.enterpriseId,
}) => {
  const scopedIds = await resolveEnterpriseIdsForRequest(req, requestedEnterpriseId);
  if (!scopedIds) return where;

  return {
    ...where,
    [field]: {
      in: scopedIds,
    },
  };
};

const assertEnterpriseInScope = async (req, enterpriseId, message = "Vous n'avez pas acces a cet element.") => {
  const scopedIds = await resolveEnterpriseIdsForRequest(req, null);
  if (!scopedIds) return;

  const normalizedEnterpriseId = parseEnterpriseId(enterpriseId);
  if (!normalizedEnterpriseId || !scopedIds.includes(normalizedEnterpriseId)) {
    const error = new Error(message);
    error.statusCode = 403;
    throw error;
  }
};

module.exports = {
  parseEnterpriseId,
  getEnterpriseList,
  getAccessibleEnterpriseIds,
  resolveEnterpriseIdsForRequest,
  resolveEnterpriseContext,
  applyEnterpriseScope,
  assertEnterpriseInScope,
};
