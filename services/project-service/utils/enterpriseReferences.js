const { accessError, authorizationHeader, parseEnterpriseId } = require('./enterpriseScope');

const lookupReference = async (req, url, enterpriseId) => {
  const authorization = authorizationHeader(req);
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: authorization, 'X-Enterprise-Id': String(enterpriseId) },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw accessError(503, 'Impossible de vérifier la ressource liée. Réessayez ultérieurement.');
  }
  if (response.status === 404 || response.status === 403) {
    throw accessError(404, 'Ressource liée introuvable dans cette entreprise.');
  }
  if (!response.ok) throw accessError(503, 'Impossible de vérifier la ressource liée.');
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw accessError(503, 'Réponse invalide lors de la vérification de la ressource liée.');
  }
  const record = payload?.data;
  if (!record || parseEnterpriseId(record.enterpriseId) !== enterpriseId) {
    throw accessError(404, 'Ressource liée introuvable dans cette entreprise.');
  }
  return record;
};

const assertCustomerInEnterprise = async (req, clientId, enterpriseId) => {
  if (typeof clientId !== 'string' || !clientId.trim()) throw accessError(400, 'clientId est requis.');
  const baseUrl = String(process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008').replace(/\/$/, '');
  return lookupReference(req, `${baseUrl}/api/clients/${encodeURIComponent(clientId)}`, enterpriseId);
};

const assertAssigneeInEnterprise = async (req, userId, enterpriseId) => {
  if ((typeof userId !== 'string' && typeof userId !== 'number') || !String(userId).trim()) {
    throw accessError(400, 'userId est requis.');
  }
  const baseUrl = String(process.env.AUTH_SERVICE_URL || 'http://auth-service:4001').replace(/\/$/, '');
  const user = await lookupReference(req, `${baseUrl}/api/users/${encodeURIComponent(String(userId))}`, enterpriseId);
  if (user.isActive !== true) throw accessError(404, 'Utilisateur actif introuvable dans cette entreprise.');
  return user;
};

module.exports = { assertCustomerInEnterprise, assertAssigneeInEnterprise };
