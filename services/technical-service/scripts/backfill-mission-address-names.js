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
  datasources: {
    db: {
      url: technicalDatabaseUrl,
    },
  },
});

const customerPrisma = new CustomerPrismaClient({
  datasources: {
    db: {
      url: customerDatabaseUrl,
    },
  },
});

const normalize = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const formatAddressValue = (address) =>
  [address.ligne1, address.ligne2, address.codePostal, address.ville, address.pays]
    .filter(Boolean)
    .join(', ');

const fallbackSiteName = (mission) => {
  const firstSegment = mission?.adresse?.split(',')?.[0]?.trim();
  return firstSegment || mission?.adresse || null;
};

async function main() {
  const missions = await technicalPrisma.$queryRawUnsafe(`
    SELECT id, "clientNom", "clientContact", adresse, "nomAdresseChantier", "createdAt"
    FROM missions
    WHERE "nomAdresseChantier" IS NULL OR "nomAdresseChantier" = ''
    ORDER BY "createdAt" ASC
  `);

  let updated = 0;
  let crmMatched = 0;
  let fallbackMatched = 0;

  for (const mission of missions) {
    let candidateName = null;

    const clientMatches = await customerPrisma.client.findMany({
      where: {
        OR: [
          { nom: { equals: mission.clientNom, mode: 'insensitive' } },
          { raisonSociale: { equals: mission.clientNom, mode: 'insensitive' } },
          ...(mission.clientContact
            ? [{ email: { equals: mission.clientContact, mode: 'insensitive' } }]
            : []),
        ],
      },
      include: { adresses: true },
      take: 20,
    });

    const normalizedMissionAddress = normalize(mission.adresse);
    for (const client of clientMatches) {
      const matchedAddress =
        client.adresses.find((address) => normalize(formatAddressValue(address)) === normalizedMissionAddress) ||
        client.adresses.find((address) => {
          const name = normalize(address.nomAdresse);
          return name && normalizedMissionAddress.includes(name);
        }) ||
        client.adresses.find((address) => address.isPrincipal);

      if (matchedAddress) {
        candidateName =
          matchedAddress.nomAdresse?.trim() ||
          matchedAddress.ligne1?.trim() ||
          fallbackSiteName(mission);
        if (candidateName) {
          crmMatched += 1;
          break;
        }
      }
    }

    if (!candidateName) {
      candidateName = fallbackSiteName(mission);
      if (candidateName) {
        fallbackMatched += 1;
      }
    }

    if (!candidateName) {
      continue;
    }

    await technicalPrisma.$executeRawUnsafe(
      `UPDATE missions SET "nomAdresseChantier" = $1, "updatedAt" = NOW() WHERE id = $2`,
      candidateName,
      mission.id
    );
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
