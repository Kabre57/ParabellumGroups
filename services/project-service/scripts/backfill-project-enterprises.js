const fs = require('node:fs');
const { accessError, isGlobalUser, parseEnterpriseId, resolveEnterpriseId } = require('../utils/enterpriseScope');
const { assertCustomerInEnterprise, assertAssigneeInEnterprise } = require('../utils/enterpriseReferences');

const validateMapping = (mapping) => {
  if (!Array.isArray(mapping) || mapping.length === 0) throw new Error('Le fichier doit contenir une liste non vide de rattachements vérifiés.');
  const seen = new Set();
  return mapping.map((entry) => {
    if (!entry || typeof entry.projectId !== 'string' || !entry.projectId.trim() ||
        typeof entry.clientId !== 'string' || !entry.clientId.trim() || !parseEnterpriseId(entry.enterpriseId)) {
      throw new Error('Chaque rattachement doit préciser projectId, clientId et un enterpriseId entier positif.');
    }
    if (seen.has(entry.projectId)) throw new Error('Un même projet ne peut pas apparaître deux fois dans le fichier.');
    seen.add(entry.projectId);
    return { projectId: entry.projectId, clientId: entry.clientId, enterpriseId: parseEnterpriseId(entry.enterpriseId) };
  });
};

const getOperator = async (authorization) => {
  const baseUrl = String(process.env.AUTH_SERVICE_URL || 'http://auth-service:4001').replace(/\/$/, '');
  let user;
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: authorization }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Operator lookup rejected');
    user = (await response.json())?.data;
  } catch {
    throw accessError(503, 'Impossible de vérifier le compte opérateur.');
  }
  if (!user?.isActive || !isGlobalUser(user)) throw accessError(403, 'Un compte global actif est requis pour le rattachement historique.');
  return user;
};

// No default enterprise and no inference from the operator: every assignment
// comes from a reviewed manifest and a client verified in that exact context.
const runBackfill = async ({ prisma, mapping, authorization, apply = false }) => {
  const entries = validateMapping(mapping);
  if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) throw new Error('Un jeton opérateur Bearer est requis.');
  const user = await getOperator(authorization);

  // Validate the complete manifest before the first write.
  for (const entry of entries) {
    const project = await prisma.projet.findFirst({
      where: { id: entry.projectId, clientId: entry.clientId, enterpriseId: null },
      include: { taches: { select: { assignations: { select: { userId: true } } } } },
    });
    if (!project) throw new Error(`Projet ${entry.projectId}: absent, déjà rattaché ou client différent du manifeste.`);
    const req = {
      user, headers: { authorization, 'x-enterprise-id': String(entry.enterpriseId) }, query: {}, body: {},
    };
    await resolveEnterpriseId(req);
    await assertCustomerInEnterprise(req, entry.clientId, entry.enterpriseId);
    const assignees = new Set((project.taches || []).flatMap((task) =>
      (task.assignations || []).map((assignment) => assignment.userId)));
    for (const userId of assignees) {
      await assertAssigneeInEnterprise(req, userId, entry.enterpriseId);
    }
  }

  if (apply) {
    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.projet.updateMany({
          where: { id: entry.projectId, clientId: entry.clientId, enterpriseId: null },
          data: { enterpriseId: entry.enterpriseId },
        });
        if (result.count !== 1) throw new Error(`Projet ${entry.projectId}: modification concurrente; transaction annulée.`);
      }
    });
  }
  return { mode: apply ? 'apply' : 'dry-run', projects: entries.length, mapping: entries };
};

const main = async () => {
  const args = process.argv.slice(2);
  const mappingIndex = args.indexOf('--mapping');
  if (args.includes('--help')) {
    console.log('Usage: node scripts/backfill-project-enterprises.js --mapping <fichier.json> [--apply]');
    console.log('Mode par défaut: dry-run. Jeton via PROJECT_BACKFILL_TOKEN; aucune donnée de connexion dans les arguments.');
    return;
  }
  if (mappingIndex < 0 || !args[mappingIndex + 1]) throw new Error('--mapping <fichier.json> est obligatoire.');
  const knownArgs = new Set([mappingIndex, mappingIndex + 1]);
  for (let index = 0; index < args.length; index += 1) {
    if (!knownArgs.has(index) && args[index] !== '--apply') throw new Error('Argument inconnu. Consultez --help.');
  }
  const token = process.env.PROJECT_BACKFILL_TOKEN;
  if (!token) throw new Error('PROJECT_BACKFILL_TOKEN est requis.');
  const mapping = JSON.parse(fs.readFileSync(args[mappingIndex + 1], 'utf8'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const report = await runBackfill({ prisma, mapping, authorization: `Bearer ${token}`, apply: args.includes('--apply') });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { runBackfill, validateMapping };
