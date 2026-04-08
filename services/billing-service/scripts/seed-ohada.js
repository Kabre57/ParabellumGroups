const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ohadaAccounts = [
  // CLASSE 1 : COMPTES DE RESSOURCES DURABLES
  { code: '101', label: 'Capital social', type: 'EQUITY' },
  { code: '121', label: 'Résultat net', type: 'EQUITY' },
  { code: '161', label: 'Emprunts obligataires', type: 'LIABILITY' },

  // CLASSE 2 : COMPTES D'IMMOBILISATIONS
  { code: '211', label: 'Frais de développement', type: 'ASSET' },
  { code: '241', label: 'Matériel et outillage', type: 'ASSET' },
  { code: '244', label: 'Matériel de transport', type: 'ASSET' },
  { code: '245', label: 'Matériel de bureau', type: 'ASSET' },

  // CLASSE 3 : COMPTES DE STOCKS
  { code: '311', label: 'Marchandises', type: 'ASSET' },

  // CLASSE 4 : COMPTES DE TIERS
  { code: '401', label: 'Fournisseurs', type: 'LIABILITY' },
  { code: '411', label: 'Clients', type: 'ASSET' },
  { code: '422', label: 'Personnel, rémunérations dues', type: 'LIABILITY' },
  { code: '431', label: 'CNPS', type: 'LIABILITY' },
  { code: '442', label: 'État, impôts et taxes', type: 'LIABILITY' },
  { code: '445', label: 'État, TVA', type: 'LIABILITY' },
  { code: '4456', label: 'TVA déductible', type: 'ASSET' },
  { code: '4457', label: 'TVA collectée', type: 'LIABILITY' },

  // CLASSE 5 : COMPTES DE TRÉSORERIE
  { code: '512', label: 'Banques', type: 'ASSET' },
  { code: '521', label: 'Instruments de trésorerie', type: 'ASSET' },
  { code: '531', label: 'Caisse', type: 'ASSET' },

  // CLASSE 6 : COMPTES DE CHARGES
  { code: '601', label: 'Achats de matières premières', type: 'EXPENSE' },
  { code: '607', label: 'Achats de marchandises', type: 'EXPENSE' },
  { code: '611', label: 'Transports', type: 'EXPENSE' },
  { code: '615', label: 'Entretien et maintenance', type: 'EXPENSE' },
  { code: '618', label: 'Autres charges externes', type: 'EXPENSE' },
  { code: '625', label: 'Déplacements et missions', type: 'EXPENSE' },
  { code: '631', label: 'Impôts et taxes directs', type: 'EXPENSE' },
  { code: '661', label: 'Charges de personnel', type: 'EXPENSE' },

  // CLASSE 7 : COMPTES DE PRODUITS
  { code: '701', label: 'Ventes de produits finis', type: 'REVENUE' },
  { code: '706', label: 'Services vendus / Prestations', type: 'REVENUE' },
  { code: '707', label: 'Ventes de marchandises', type: 'REVENUE' },

  // CLASSE 8 : COMPTES DES AUTRES CHARGES/PRODUITS
  { code: '811', label: 'Valeurs comptables des cessions', type: 'EXPENSE' },
];

async function seed() {
  console.log('🚀 Début de l\'importation du Plan Comptable OHADA...');

  for (const account of ohadaAccounts) {
    try {
      await prisma.accountingAccount.upsert({
        where: { code: account.code },
        update: {
          label: account.label,
          type: account.type,
          isActive: true
        },
        create: {
          code: account.code,
          label: account.label,
          type: account.type,
          isSystem: true
        }
      });
      console.log(`✅ Compte ${account.code} (${account.label}) injecté.`);
    } catch (error) {
      console.error(`❌ Erreur sur le compte ${account.code}:`, error.message);
    }
  }

  console.log('✨ Importation terminée.');
}

seed()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
