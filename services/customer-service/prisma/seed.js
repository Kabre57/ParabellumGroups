const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();


const { seedCustomers } = require('./seed/customers');
const { seedCustomerRelations } = require('./seed/customerRelations');
const { seedCommercialHistory } = require('./seed/commercialHistory');
const { seedCustomerRecords } = require('./seed/customerRecords');

async function main() {
  console.log('🌱 Début du seeding...');

  // Nettoyer la base de données (attention en production!)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Nettoyage de la base de données...');

    // Désactiver les contraintes de clé étrangère temporairement
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;

    // Supprimer les données dans le bon ordre
    const models = [
      'SynchronisationProspectClient',
      'HistoriqueClient',
      'TagClient',
      'AbonnementClient',
      'PreferenceClient',
      'LigneFacture',
      'Facture',
      'LigneProduit',
      'Opportunite',
      'TacheClient',
      'NoteClient',
      'DocumentClient',
      'InteractionClient',
      'AdresseClient',
      'AvenantContrat',
      'Contrat',
      'Contact',
      'Client',
      'SecteurActivite',
      'TypeClient',
      'MappingStatus'
    ];

    for (const model of models) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${prisma._getTableName(model)}" CASCADE;`);
        console.log(`✅ Table ${model} nettoyée`);
      } catch (error) {
        console.log(`⚠️  Impossible de nettoyer ${model}: ${error.message}`);
      }
    }

    // Réactiver les contraintes
    await prisma.$executeRaw`SET session_replication_role = 'origin';`;
  }


  const { clients } = await seedCustomers(prisma);
  const customerRelations = await seedCustomerRelations(prisma, { clients });
  await seedCommercialHistory(prisma, { clients, contacts: customerRelations.contacts });
  await seedCustomerRecords(prisma, { ...customerRelations, clients });

  console.log('???? Seeding termin?? avec succ??s !');
}


main()
  .catch((error) => {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
