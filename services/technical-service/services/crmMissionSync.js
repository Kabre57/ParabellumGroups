const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CUSTOMERS_SERVICE_URL = process.env.CUSTOMERS_SERVICE_URL || 'http://customer-service:4008';

const formatAddressValue = (address) =>
  [address?.ligne1, address?.ligne2, address?.codePostal, address?.ville, address?.pays]
    .filter(Boolean)
    .join(', ');

const getAddressSiteName = (address) =>
  address?.nomAdresse?.trim() || [address?.ligne1, address?.ville].filter(Boolean).join(', ');

const buildAuthHeaders = (reqOrUser) => {
  const userId = reqOrUser?.headers?.['x-user-id'] || reqOrUser?.user?.id || reqOrUser?.id || '1';
  const userRole = reqOrUser?.headers?.['x-user-role'] || reqOrUser?.user?.role || reqOrUser?.role || 'admin';

  return {
    'Content-Type': 'application/json',
    'x-user-id': String(userId),
    'x-user-role': String(userRole),
  };
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CRM sync request failed (${response.status}): ${body}`);
  }

  return response.json();
};

const fetchClientDetail = async (clientId, reqOrUser) => {
  if (!clientId) return null;

  const payload = await fetchJson(`${CUSTOMERS_SERVICE_URL}/api/clients/${clientId}`, {
    headers: buildAuthHeaders(reqOrUser),
  });

  return payload?.data || payload || null;
};

const resolveMissionSnapshot = (mission, client, addresses, preferredAddressId) => {
  const matchedAddress =
    addresses.find((address) => address.id === preferredAddressId) ||
    addresses.find((address) => address.id === mission.crmAdresseId) ||
    addresses.find((address) => getAddressSiteName(address) === mission.nomAdresseChantier) ||
    addresses.find((address) => formatAddressValue(address) === mission.adresse) ||
    addresses.find((address) => address.isPrincipal) ||
    addresses[0] ||
    null;

  return {
    crmClientId: client?.id || mission.crmClientId || null,
    crmAdresseId: matchedAddress?.id || null,
    clientNom: client?.nom || mission.clientNom,
    clientContact: client?.telephone || client?.mobile || client?.email || mission.clientContact || null,
    nomAdresseChantier: matchedAddress ? getAddressSiteName(matchedAddress) : mission.nomAdresseChantier || null,
    adresse: matchedAddress ? formatAddressValue(matchedAddress) : mission.adresse,
  };
};

const syncMissionById = async (missionId, reqOrUser) => {
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission?.crmClientId) {
    return { updated: false, reason: 'Mission not linked to CRM client' };
  }

  const client = await fetchClientDetail(mission.crmClientId, reqOrUser);
  if (!client) {
    return { updated: false, reason: 'CRM client not found' };
  }

  const addresses = Array.isArray(client.adresses) ? client.adresses : [];
  const snapshot = resolveMissionSnapshot(mission, client, addresses, mission.crmAdresseId);

  const updated = await prisma.mission.update({
    where: { id: missionId },
    data: snapshot,
  });

  return { updated: true, mission: updated };
};

const syncMissionsByClient = async ({ clientId, addressId, deletedAddressId }, reqOrUser) => {
  if (!clientId) {
    return { updated: 0, missions: [] };
  }

  const client = await fetchClientDetail(clientId, reqOrUser);
  if (!client) {
    return { updated: 0, missions: [] };
  }

  const addresses = Array.isArray(client.adresses) ? client.adresses : [];
  // Recalculer toutes les missions du client garantit que:
  // - un renommage d'adresse est propagé sans dépendre d'un ancien snapshot
  // - un changement d'adresse principale peut réaligner les missions historiques
  // - une suppression d'adresse choisit automatiquement la meilleure adresse restante
  const missions = await prisma.mission.findMany({
    where: { crmClientId: clientId },
  });
  const updatedMissions = [];

  for (const mission of missions) {
    const preferredAddressId =
      mission.crmAdresseId === deletedAddressId
        ? undefined
        : mission.crmAdresseId || addressId;
    const snapshot = resolveMissionSnapshot(mission, client, addresses, preferredAddressId);
    const updated = await prisma.mission.update({
      where: { id: mission.id },
      data: snapshot,
    });
    updatedMissions.push(updated);
  }

  return {
    updated: updatedMissions.length,
    missions: updatedMissions,
  };
};

module.exports = {
  syncMissionById,
  syncMissionsByClient,
  formatAddressValue,
  getAddressSiteName,
};
