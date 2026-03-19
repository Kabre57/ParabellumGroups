const { PrismaClient } = require('@prisma/client');
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

  // Seed Roles (uniquement 2 rôles système)
  console.log('Creating roles...');
  const roles = await Promise.all([
    ensureRole({
      name: 'Administrateur',
      code: 'ADMIN',
      description: 'Accès complet au système',
    }),
    ensureRole({
      name: 'Direction Générale',
      code: 'GENERAL_DIRECTOR',
      description: 'Validation et supervision générale',
    }),
    ensureRole({
      name: 'Employé',
      code: 'EMPLOYEE',
      description: 'Utilisateur standard',
    }),
    ensureRole({
      name: 'Comptable',
      code: 'ACCOUNTANT',
      description: 'Suivi comptable, bons de caisse et décaissements',
    }),
    ensureRole({
      name: 'Service Achat',
      code: 'PURCHASING_MANAGER',
      description: 'Rôle préconfiguré pour les achats, le chiffrage fournisseur, les commandes et les stocks',
    }),
  ]);
  console.log(`✅ Created ${roles.length} roles`);

  // Seed Permissions Categories
  console.log('Creating permissions...');
  const permissionCategories = [
    {
      category: 'dashboard',
      permissions: [
        { name: 'dashboard.view', description: 'Voir le tableau de bord' },
        { name: 'dashboard.analytics', description: 'Voir les statistiques avancées' },
      ],
    },
    {
      category: 'users',
      permissions: [
        { name: 'users.read', description: 'Voir les utilisateurs' },
        { name: 'users.create', description: 'Créer des utilisateurs' },
        { name: 'users.update', description: 'Modifier des utilisateurs' },
        { name: 'users.delete', description: 'Supprimer des utilisateurs' },
      ],
    },
    {
      category: 'services',
      permissions: [
        { name: 'services.read', description: 'Voir les services' },
        { name: 'services.create', description: 'Créer des services' },
        { name: 'services.update', description: 'Modifier des services' },
        { name: 'services.delete', description: 'Supprimer des services' },
      ],
    },
    {
      category: 'roles',
      permissions: [
        { name: 'roles.read', description: 'Voir les rôles' },
        { name: 'roles.create', description: 'Créer des rôles' },
        { name: 'roles.update', description: 'Modifier des rôles' },
        { name: 'roles.delete', description: 'Supprimer des rôles' },
      ],
    },
    {
      category: 'permissions',
      permissions: [
        { name: 'permissions.read', description: 'Voir les permissions' },
        { name: 'permissions.manage', description: 'Gérer les permissions par rôle' },
      ],
    },
  ];

  let permissionCount = 0;
  for (const cat of permissionCategories) {
    for (const perm of cat.permissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: {
          name: perm.name,
          description: perm.description,
          category: cat.category,
        },
      });
      permissionCount++;
    }
  }
  console.log(`✅ Created ${permissionCount} permissions`);

  // Apply default templates only after permissions exist
  const { applyTemplate } = require('../src/utils/roleTemplates');
  for (const r of roles) {
    if (['ADMIN', 'GENERAL_DIRECTOR', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER'].includes(r.code)) {
      await applyTemplate(r.code);
    }
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
