const { PrismaClient } = require('@prisma/client');
const {
  completePermissions,
  obsoletePermissionNames,
  systemRoles,
  assertValidPermissionRegistry,
} = require('../src/permissions');
const { applyTemplate } = require('../src/utils/roleTemplates');

const prisma = new PrismaClient();

const procurementApprovalPermissions = [
  'purchase_requests.approve',
  'purchase_requests.reject',
  'purchases.approve',
  'purchases.reject',
];

const purchasingSubmissionPermissions = ['purchases.submit'];

async function ensurePermissions(dryRun = false) {
  for (const [category, categoryData] of Object.entries(completePermissions)) {
    for (const permission of categoryData.permissions) {
      if (dryRun) {
        const existing = await prisma.permission.findUnique({ where: { name: permission.name } });
        if (!existing) {
          console.log(`[dry-run] permission à créer: ${permission.name} (${category})`);
        }
        continue;
      }

      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          category,
        },
        create: {
          name: permission.name,
          description: permission.description,
          category,
        },
      });
    }
  }
}

async function ensureRoles(dryRun = false) {
  for (const role of systemRoles) {
    const existing = await prisma.role.findFirst({
      where: {
        OR: [{ code: role.code }, { name: role.name }],
      },
    });

    if (dryRun) {
      console.log(
        existing
          ? `[dry-run] rôle à aligner: ${role.code}`
          : `[dry-run] rôle à créer: ${role.code}`
      );
      continue;
    }

    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          name: role.name,
          code: role.code,
          description: role.description,
          isSystem: true,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.role.create({
      data: {
        ...role,
        isSystem: true,
        isActive: true,
      },
    });
  }
}

async function syncRolePermissions(roleCode, dryRun = false) {
  const summary = await applyTemplate(roleCode, {
    dryRun,
    replace: true,
    logger: console,
  });

  if (dryRun) {
    console.log(
      `[dry-run] ${roleCode}: ${summary.matchedPermissions} permissions, +${summary.wouldCreate}, ~${summary.wouldUpdate}, -${summary.wouldDelete}`
    );
  }
}

async function pruneObsoletePermissions(dryRun = false) {
  const names = [...new Set(obsoletePermissionNames)];
  if (!names.length) {
    console.log('Aucune permission obsolete declaree.');
    return;
  }

  const obsoletePermissions = await prisma.permission.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  if (!obsoletePermissions.length) {
    console.log('Aucune permission obsolete presente en base.');
    return;
  }

  const obsoleteIds = obsoletePermissions.map((permission) => permission.id);

  if (dryRun) {
    console.log(`[dry-run] ${obsoletePermissions.length} permission(s) obsolete(s) a supprimer:`);
    obsoletePermissions.forEach((permission) => console.log(` - ${permission.name}`));
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.permissionChangeRequest.deleteMany({
      where: { permissionId: { in: obsoleteIds } },
    });
    await tx.rolePermission.deleteMany({
      where: { permissionId: { in: obsoleteIds } },
    });
    await tx.userPermission.deleteMany({
      where: { permission_id: { in: obsoleteIds } },
    });
    await tx.permission.deleteMany({
      where: { id: { in: obsoleteIds } },
    });
  });

  console.log(`${obsoletePermissions.length} permission(s) obsolete(s) supprimee(s) de la base.`);
}

async function cleanupDirectPermissions(dryRun = false) {
  const approvalPerms = await prisma.permission.findMany({
    where: { name: { in: procurementApprovalPermissions } },
    select: { id: true, name: true },
  });

  const submitPerms = await prisma.permission.findMany({
    where: { name: { in: purchasingSubmissionPermissions } },
    select: { id: true, name: true },
  });

  const approvalPermIds = approvalPerms.map((item) => item.id);
  const submitPermIds = submitPerms.map((item) => item.id);

  if (dryRun) {
    console.log('[dry-run] nettoyage des permissions directes incohérentes ignoré (aucune écriture).');
    return;
  }

  if (approvalPermIds.length) {
    await prisma.userPermission.deleteMany({
      where: {
        permission_id: { in: approvalPermIds },
        users: {
          role: {
            code: {
              notIn: ['ADMIN', 'GENERAL_DIRECTOR', 'GERANT'],
            },
          },
        },
      },
    });
  }

  if (submitPermIds.length) {
    await prisma.userPermission.deleteMany({
      where: {
        permission_id: { in: submitPermIds },
        users: {
          role: {
            code: {
              notIn: ['ADMIN', 'PURCHASING_MANAGER', 'GERANT'],
            },
          },
        },
      },
    });
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pruneObsolete = process.argv.includes('--prune-obsolete');

  if (dryRun) {
    console.log('Mode dry-run activé: aucune modification ne sera écrite.');
  }

  const registrySummary = assertValidPermissionRegistry();
  console.log(
    `Registre modulaire: ${registrySummary.moduleCount} modules, ` +
      `${registrySummary.categoryCount} categories, ${registrySummary.permissionCount} permissions.`
  );

  console.log('Synchronisation des permissions complètes...');
  await ensurePermissions(dryRun);

  if (pruneObsolete) {
    console.log('Suppression des permissions obsoletes...');
    await pruneObsoletePermissions(dryRun);
  }

  console.log('Synchronisation des rôles système...');
  await ensureRoles(dryRun);

  for (const role of systemRoles) {
    console.log(` - alignement du rôle ${role.code}`);
    await syncRolePermissions(role.code, dryRun);
  }

  console.log('Nettoyage des permissions directes incohérentes...');
  await cleanupDirectPermissions(dryRun);

  console.log('Synchronisation terminée.');
}

main()
  .catch((error) => {
    console.error('Erreur de synchronisation:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
