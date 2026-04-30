const { PrismaClient } = require('@prisma/client');
const {
  completePermissions,
  systemRoles,
  assertValidPermissionRegistry,
} = require('../src/permissions');

const prisma = new PrismaClient();

async function ensureRole({ name, code, description, isSystem = true, isActive = true }) {
  const existingRole = await prisma.role.findFirst({
    where: {
      OR: [{ code }, { name }],
    },
  });

  if (existingRole) {
    return prisma.role.update({
      where: { id: existingRole.id },
      data: {
        name,
        code,
        description,
        isSystem,
        isActive,
      },
    });
  }

  return prisma.role.create({
    data: {
      name,
      code,
      description,
      isSystem,
      isActive,
    },
  });
}

async function main() {
  console.log('🌱 Starting seed...');

  const registrySummary = assertValidPermissionRegistry();
  console.log(
    `Registry OK: ${registrySummary.moduleCount} modules, ` +
      `${registrySummary.categoryCount} categories, ${registrySummary.permissionCount} permissions`
  );

  // Seed Roles
  console.log('Creating roles...');
  const roles = await Promise.all(systemRoles.map((role) => ensureRole(role)));
  console.log(`✅ Created ${roles.length} roles`);

  // Seed Permissions Categories
  console.log('Creating permissions...');
  let permissionCount = 0;
  for (const [category, categoryData] of Object.entries(completePermissions)) {
    for (const perm of categoryData.permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {
          description: perm.description,
          category,
        },
        create: {
          name: perm.name,
          description: perm.description,
          category,
        },
      });
      permissionCount++;
    }
  }
  console.log(`✅ Created ${permissionCount} permissions`);

  // Apply default templates only after permissions exist
  const { applyTemplate } = require('../src/utils/roleTemplates');
  for (const r of roles) {
    await applyTemplate(r.code);
  }

  // Seed Services
  console.log('Creating services...');
  const directionGenerale = await prisma.service.upsert({
    where: { code: 'DG' },
    update: {},
    create: {
      name: 'Direction Générale',
      code: 'DG',
      description: 'Direction générale de l\'entreprise',
      isActive: true,
    },
  });

  await prisma.service.upsert({
    where: { code: 'COMM' },
    update: {},
    create: {
      name: 'Direction Commerciale',
      code: 'COMM',
      description: 'Service commercial et ventes',
      parentId: directionGenerale.id,
      isActive: true,
    },
  });

  await prisma.service.upsert({
    where: { code: 'TECH' },
    update: {},
    create: {
      name: 'Direction Technique',
      code: 'TECH',
      description: 'Service technique et interventions',
      parentId: directionGenerale.id,
      isActive: true,
    },
  });

  await prisma.service.upsert({
    where: { code: 'COMPTA' },
    update: {},
    create: {
      name: 'Direction Comptabilité',
      code: 'COMPTA',
      description: 'Service comptabilité et finances',
      parentId: directionGenerale.id,
      isActive: true,
    },
  });

  console.log('✅ Created 4 services');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
