const TECHNICAL_SERVICE_URL = process.env.TECHNICAL_SERVICE_URL || 'http://technical-service:4003';

/**
 * Resynchronise les missions du service technique depuis une adresse client CRM.
 *
 * L'appel est authentifié avec le jeton Bearer de la requête originale afin que
 * le service technique puisse vérifier le périmètre entreprise. Les erreurs HTTP
 * sont loguées mais ne bloquent pas la réponse principale ; une panne de ce
 * service ne doit pas empêcher la mise à jour du client.
 *
 * @param {import('express').Request|object} reqOrUser - Requête Express ou objet user.
 * @param {string} clientId - Identifiant du client CRM.
 * @param {object} [options] - Corps optionnel de la requête PATCH.
 */
const syncMissionsFromClientAddress = async (reqOrUser, clientId, options = {}) => {
  if (!clientId) {
    return;
  }

  // Extraire le jeton Bearer depuis la requête originale.
  const authorization = reqOrUser?.headers?.authorization || reqOrUser?.authorization;
  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    console.warn('syncMissionsFromClientAddress: jeton Bearer absent, synchronisation ignorée', { clientId });
    return;
  }

  const url = `${TECHNICAL_SERVICE_URL}/api/missions/resync-crm/by-client/${encodeURIComponent(clientId)}`;
  // Scoped controllers have already validated this selection. Keep the same
  // context when the user operates on an authorized subsidiary.
  const enterpriseId = reqOrUser?.headers?.['x-enterprise-id'] ??
    reqOrUser?.query?.enterpriseId ?? reqOrUser?.body?.enterpriseId ?? reqOrUser?.user?.enterpriseId;

  let response;
  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        ...(enterpriseId ? { 'X-Enterprise-Id': String(enterpriseId) } : {}),
      },
      body: JSON.stringify(options),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    // Panne réseau ou timeout : loguer et continuer sans bloquer.
    console.error('syncMissionsFromClientAddress: erreur réseau', { clientId, error: error?.message });
    return;
  }

  if (!response.ok) {
    // Statut HTTP inattendu : loguer pour alerte mais ne pas bloquer le flux principal.
    console.error('syncMissionsFromClientAddress: réponse HTTP en erreur', {
      clientId,
      status: response.status,
      url,
    });
  }
};

module.exports = {
  syncMissionsFromClientAddress,
};
