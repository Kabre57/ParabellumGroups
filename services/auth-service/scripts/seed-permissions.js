const { PrismaClient } = require('@prisma/client');
const { completePermissions, assertValidPermissionRegistry } = require('../src/permissions');

const prisma = new PrismaClient();

/**
 * Script d'initialisation des permissions granulaires depuis le registre modulaire.
 */



async function seedPermissions() {
  console.log('🌱 Début de l\'initialisation des permissions...\n');

  const registrySummary = assertValidPermissionRegistry();
  console.log(
    `Registre modulaire: ${registrySummary.moduleCount} modules, ` +
      `${registrySummary.categoryCount} categories, ${registrySummary.permissionCount} permissions`
  );

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const [categoryKey, categoryData] of Object.entries(completePermissions)) {
    console.log(`📁 Catégorie: ${categoryData.label}`);

    for (const perm of categoryData.permissions) {
      try {
        // Vérifier si la permission existe déjà
        const existing = await prisma.permission.findUnique({
          where: { name: perm.name }
        });

        if (existing) {
          console.log(`   ⏭️  ${perm.name} (existe déjà)`);
          totalSkipped++;
        } else {
          await prisma.permission.create({
            data: {
              name: perm.name,
              description: perm.description,
              category: categoryKey
            }
          });
          console.log(`   ✅ ${perm.name}`);
          totalCreated++;
        }
      } catch (error) {
        console.error(`   ❌ Erreur pour ${perm.name}:`, error.message);
      }
    }
    console.log('');
  }

  console.log('📊 Résumé:');
  console.log(`   ✅ Permissions créées: ${totalCreated}`);
  console.log(`   ⏭️  Permissions ignorées (existantes): ${totalSkipped}`);
  console.log(`   📝 Total: ${totalCreated + totalSkipped}\n`);

  // Compter le total en base
  const total = await prisma.permission.count();
  console.log(`💾 Total de permissions en base de données: ${total}\n`);
}

async function main() {
  try {
    await seedPermissions();
    console.log('✨ Initialisation terminée avec succès!\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
