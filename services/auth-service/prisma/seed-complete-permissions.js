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

/**
 * Script d'initialisation COMPLÃˆTE de toutes les permissions du système
 *
 * Couvre l'ensemble des modules de l'ERP Parabellum:
 * - Dashboard & Analytics
 * - Gestion Utilisateurs & Authentification
 * - Commercial & Prospection
 * - CRM Clients
 * - Facturation & Paiements
 * - Ressources Humaines
 * - Services Techniques
 * - Gestion de Projets
 * - Approvisionnement & Achats
 * - Inventaire & Stock
 * - Communication
 * - Administration Système
 */

const { completePermissions, systemRoles, assertValidPermissionRegistry } = require('../src/permissions');

const toAscii = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');

const line = (char = '=', width = 70) => char.repeat(width);

async function seedCompletePermissions() {
  console.log(line('='));
  console.log('INITIALISATION COMPLETE DES PERMISSIONS SYSTEME');
  console.log(line('=') + '\n');

  const registrySummary = assertValidPermissionRegistry();
  console.log(
    `Registre modulaire valide: ${registrySummary.moduleCount} modules, ` +
      `${registrySummary.categoryCount} categories, ${registrySummary.permissionCount} permissions`
  );

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  const categoryCount = Object.keys(completePermissions).length;
  let currentCategory = 0;

  for (const [categoryKey, categoryData] of Object.entries(completePermissions)) {
    currentCategory++;
    console.log(`\n${line('=')}`);
    console.log(`[${currentCategory}/${categoryCount}] ${toAscii(categoryData.label)} (${categoryKey})`);
    console.log(line('-'));

    for (const perm of categoryData.permissions) {
      try {
        // Vérifier si la permission existe déjâ 
        const existing = await prisma.permission.findUnique({
          where: { name: perm.name }
        });

        if (existing) {
          console.log(`   - ${perm.name.padEnd(50)} [already exists]`);
          totalSkipped++;
        } else {
          await prisma.permission.create({
            data: {
              name: perm.name,
              description: perm.description,
              category: categoryKey
            }
          });
          console.log(`   + ${perm.name.padEnd(50)} [created]`);
          totalCreated++;
        }
      } catch (error) {
        console.error(`   ! ${perm.name.padEnd(50)} [ERROR: ${toAscii(error.message)}]`);
        totalErrors++;
      }
    }
  }

  console.log('\n' + line('='));
  console.log('RESUME DE L INITIALISATION');
  console.log(line('='));
  console.log(`   Created permissions:             ${totalCreated.toString().padStart(4)}`);
  console.log(`   Skipped permissions:             ${totalSkipped.toString().padStart(4)} (already existing)`);
  console.log(`   Errors:                          ${totalErrors.toString().padStart(4)}`);
  console.log(`   ${line('-', 38)}`);
  console.log(`   Total processed:                 ${(totalCreated + totalSkipped + totalErrors).toString().padStart(4)}`);

  // Compter le total en base
  const totalInDb = await prisma.permission.count();
  console.log(`\nTotal permissions in database: ${totalInDb}`);

  // optionally apply default templates to system roles (if helper available)
  try {
    for (const role of systemRoles) {
      await ensureRole(role);
    }

    const { applyTemplate } = require('../src/utils/roleTemplates');
    for (const role of systemRoles) {
      await applyTemplate(role.code);
      console.log(`Applied template ${role.code}`);
    }
  } catch (e) {
    // if file not present or other error, ignore
  }

  // Statistiques par catégorie
  console.log('\nPER CATEGORY BREAKDOWN:');
  console.log(line('='));

  const categories = await prisma.permission.groupBy({
    by: ['category'],
    _count: {
      category: true
    },
    orderBy: {
      _count: {
        category: 'desc'
      }
    }
  });

  for (const cat of categories) {
    const categoryLabel = completePermissions[cat.category]?.label || cat.category;
    console.log(`   ${toAscii(categoryLabel).padEnd(40)} ${cat._count.category.toString().padStart(3)} permissions`);
  }

  console.log('\n' + line('='));
  console.log('INITIALISATION COMPLETED SUCCESSFULLY');
  console.log(line('=') + '\n');
}

async function main() {
  try {
    await seedCompletePermissions();
  } catch (error) {
    console.error('\nCRITICAL ERROR during initialization:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
if (require.main === module) {
  main();
}

module.exports = { completePermissions, seedCompletePermissions };
