const { PrismaClient } = require('@prisma/client');
const { completePermissions } = require('../prisma/seed-complete-permissions');
const { roleTemplates } = require('../src/utils/roleTemplates');

const prisma = new PrismaClient();

const systemRoles = [
  {
    name: 'Administrateur',
    code: 'ADMIN',
    description: 'Accès complet au système',
  },
  {
    name: 'Direction Générale',
    code: 'GENERAL_DIRECTOR',
    description: 'Validation et supervision générale',
  },
  {
    name: 'Employé',
    code: 'EMPLOYEE',
    description: 'Utilisateur standard',
  },
  {
    name: 'Comptable',
    code: 'ACCOUNTANT',
    description: 'Suivi comptable, bons de caisse et décaissements',
  },
  {
    name: 'Service Achat',
    code: 'PURCHASING_MANAGER',
    description: 'Préparation des demandes, consultation fournisseurs, commandes et réceptions',
  },
  {
    name: 'Commercial',
    code: 'COMMERCIAL',
    description: 'Prospection, pipeline, devis clients et suivi commercial',
  },
];

const procurementApprovalPermissions = [
  'purchase_requests.approve',
  'purchase_requests.reject',
  'purchases.approve',
  'purchases.reject',
];

const purchasingSubmissionPermissions = ['purchases.submit'];

async function ensurePermissions() {
  for (const [category, categoryData] of Object.entries(completePermissions)) {
    for (const permission of categoryData.permissions) {
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

async function ensureRoles() {
  for (const role of systemRoles) {
    const existing = await prisma.role.findFirst({
      where: {
        OR: [{ code: role.code }, { name: role.name }],
      },
    });

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

async function syncRolePermissions(roleCode) {
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) return;

  const template = roleTemplates[roleCode] || [];
  const permissions = template.includes('*')
    ? await prisma.permission.findMany({ select: { id: true } })
    : await prisma.permission.findMany({
        where: { name: { in: template } },
        select: { id: true },
      });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  if (!permissions.length) return;

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canApprove: true,
    })),
    skipDuplicates: true,
  });
}

async function cleanupDirectPermissions() {
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

  if (approvalPermIds.length) {
    await prisma.userPermission.deleteMany({
      where: {
        permission_id: { in: approvalPermIds },
        users: {
          role: {
            code: {
              notIn: ['ADMIN', 'GENERAL_DIRECTOR'],
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
              notIn: ['ADMIN', 'PURCHASING_MANAGER'],
            },
          },
        },
      },
    });
  }
}

async function main() {
  console.log('Synchronisation des permissions complètes...');
  await ensurePermissions();

  console.log('Synchronisation des rôles système...');
  await ensureRoles();

  for (const role of systemRoles) {
    console.log(` - alignement du rôle ${role.code}`);
    await syncRolePermissions(role.code);
  }

  console.log('Nettoyage des permissions directes incohérentes...');
  await cleanupDirectPermissions();

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
