const path = require('path');
const { createRequire } = require('module');

const technicalRoot = path.resolve(__dirname, '..');
const customerRoot = path.resolve(__dirname, '../../customer-service');

const technicalRequire = createRequire(path.join(technicalRoot, 'package.json'));
const customerRequire = createRequire(path.join(customerRoot, 'package.json'));
const dotenv = technicalRequire('dotenv');

const rootEnv = dotenv.config({ path: path.resolve(technicalRoot, '../../.env') }).parsed || {};
const technicalEnv = dotenv.config({ path: path.join(technicalRoot, '.env') }).parsed || {};
const customerEnv = dotenv.config({ path: path.join(customerRoot, '.env') }).parsed || {};

const buildDatabaseUrl = (dbName) => {
  const user = rootEnv.DB_USER || rootEnv.POSTGRES_USER || 'postgres';
  const password = rootEnv.DB_PASSWORD || rootEnv.POSTGRES_PASSWORD;
  if (!password) {
    return null;
  }
  return `postgresql://${user}:${password}@postgres:5432/${dbName}?schema=public`;
};

const replaceDatabaseName = (databaseUrl, dbName) => {
  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  } catch (error) {
    return null;
  }
};

const technicalDatabaseUrl =
  process.env.TECHNICAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  technicalEnv.DATABASE_URL ||
  buildDatabaseUrl('parabellum_technical');

const customerDatabaseUrl =
  process.env.CUSTOMER_DATABASE_URL ||
  replaceDatabaseName(process.env.TECHNICAL_DATABASE_URL || process.env.DATABASE_URL, 'parabellum_customers') ||
  customerEnv.DATABASE_URL ||
  replaceDatabaseName(technicalDatabaseUrl, 'parabellum_customers') ||
  buildDatabaseUrl('parabellum_customers');

if (!technicalDatabaseUrl) {
  throw new Error('Impossible de déterminer la DATABASE_URL du technical-service');
}

if (!customerDatabaseUrl) {
  throw new Error('Impossible de déterminer la DATABASE_URL du customer-service');
}

const { PrismaClient: TechnicalPrismaClient } = technicalRequire('@prisma/client');
const { PrismaClient: CustomerPrismaClient } = customerRequire('@prisma/client');

const technicalPrisma = new TechnicalPrismaClient({
  datasources: { db: { url: technicalDatabaseUrl } },
});

const customerPrisma = new CustomerPrismaClient({
  datasources: { db: { url: customerDatabaseUrl } },
});

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const formatAddressValue = (address) =>
  [address.ligne1, address.ligne2, address.codePostal, address.ville, address.pays]
    .filter(Boolean)
    .join(', ');

const getSiteName = (address) =>
  address?.nomAdresse?.trim() || [address?.ligne1, address?.ville].filter(Boolean).join(', ').trim();

const findMatchedAddress = (mission, client) => {
  const missionAddress = normalize(mission.adresse);
  const missionSite = normalize(mission.nomAdresseChantier);

  return (
    client.adresses.find((address) => address.id === mission.crmAdresseId) ||
    client.adresses.find((address) => missionSite && normalize(getSiteName(address)) === missionSite) ||
    client.adresses.find((address) => missionAddress && normalize(formatAddressValue(address)) === missionAddress) ||
    client.adresses.find((address) => {
      const addressSite = normalize(getSiteName(address));
      return addressSite && missionAddress.includes(addressSite);
    }) ||
    client.adresses.find((address) => address.isPrincipal) ||
    client.adresses[0] ||
    null
  );
};

async function main() {
  const missions = await technicalPrisma.mission.findMany({
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  let crmMatched = 0;
  let fallbackMatched = 0;

  for (const mission of missions) {
    const candidateClients = await customerPrisma.client.findMany({
      where: {
        OR: [
          ...(mission.crmClientId ? [{ id: mission.crmClientId }] : []),
          ...(mission.clientNom ? [{ nom: { equals: mission.clientNom, mode: 'insensitive' } }] : []),
          ...(mission.clientContact ? [{ email: { equals: mission.clientContact, mode: 'insensitive' } }] : []),
        ],
      },
      include: { adresses: true },
      take: 20,
    });

    const matchedClient =
      candidateClients.find((client) => client.id === mission.crmClientId) ||
      candidateClients.find((client) => client.nom?.toLowerCase() === mission.clientNom?.toLowerCase()) ||
      candidateClients[0] ||
      null;

    let data = {};

    if (matchedClient) {
      const matchedAddress = findMatchedAddress(mission, matchedClient);
      data = {
        crmClientId: matchedClient.id,
        clientNom: matchedClient.nom || mission.clientNom,
        clientContact: matchedClient.telephone || matchedClient.mobile || matchedClient.email || mission.clientContact,
        ...(matchedAddress
          ? {
              crmAdresseId: matchedAddress.id,
              nomAdresseChantier: getSiteName(matchedAddress) || mission.nomAdresseChantier,
              adresse: formatAddressValue(matchedAddress) || mission.adresse,
            }
          : {}),
      };
      crmMatched += 1;
    } else if (!mission.nomAdresseChantier && mission.adresse) {
      data = {
        nomAdresseChantier: mission.adresse.split(',')[0]?.trim() || mission.adresse,
      };
      fallbackMatched += 1;
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    await technicalPrisma.mission.update({
      where: { id: mission.id },
      data,
    });
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        scanned: missions.length,
        updated,
        crmMatched,
        fallbackMatched,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await technicalPrisma.$disconnect();
    await customerPrisma.$disconnect();
  });
