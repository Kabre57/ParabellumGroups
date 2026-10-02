require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const accountsToAdd = [
  { code: '244200', label: 'MATERIEL INFORMATIQUE', type: 'ASSET' },
  { code: '462000', label: 'ASSOCIÉS, COMPTES COURANTS', type: 'LIABILITY' },
  { code: '467000', label: 'APPORTEURS RESTANT/ CAPITAL A', type: 'LIABILITY' },
  { code: '521100', label: 'BANQUES EN MONNAIE NATIONALE', type: 'ASSET' },
  { code: '521110', label: 'ORABANK', type: 'ASSET' },
  { code: '571100', label: 'CAISSE EN MONNAIE NATIONALE', type: 'ASSET' },
  { code: '571110', label: 'CAISSE PRINCIPALE', type: 'ASSET' },
  { code: '571120', label: 'CAISSE SECONDAIRE', type: 'ASSET' },
  { code: '601100', label: 'ACHATS DE MARCHANDISES', type: 'EXPENSE' },
  { code: '605100', label: 'FOURNITURES NON STOCKABLES', type: 'EXPENSE' },
  { code: '605200', label: 'FOURNITURES NN STOCKABLES EL', type: 'EXPENSE' },
  { code: '605300', label: 'FOURNITURES NON STOCKABLES', type: 'EXPENSE' },
  { code: '605400', label: "FOURNITURES D'ENTRETIEN NN ST", type: 'EXPENSE' },
  { code: '605600', label: 'ACHATS DE PETIT MATERIEL ET OUT', type: 'EXPENSE' },
  { code: '618300', label: 'TRANSPORTS ADMINISTRATIFS', type: 'EXPENSE' },
  { code: '622800', label: 'LOCATIONS ET CHARGES LOCATIV', type: 'EXPENSE' },
  { code: '624200', label: 'ENTRETIEN ET REPARATIONS DES B', type: 'EXPENSE' },
  { code: '627200', label: 'CATALOGUES, IMPRIMES PUBLICITA', type: 'EXPENSE' },
  { code: '628200', label: 'FRAIS DE TELEX', type: 'EXPENSE' },
];

async function main() {
  const enterpriseId = Number(process.env.ENTERPRISE_ID);
  if (!Number.isInteger(enterpriseId) || enterpriseId <= 0) {
    throw new Error('Définissez ENTERPRISE_ID avec l’identifiant de l’entreprise cible.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = [];
    const existing = [];

    for (const account of accountsToAdd) {
      const match = await tx.accountingAccount.findFirst({
        where: { code: account.code, enterpriseId },
        select: { id: true, code: true, label: true, type: true },
      });

      if (match) {
        existing.push({ ...match, expectedType: account.type });
        continue;
      }

      const createdAccount = await tx.accountingAccount.create({
        data: {
          ...account,
          enterpriseId,
          openingBalance: 0,
          currentBalance: 0,
        },
        select: { id: true, code: true, label: true, type: true },
      });
      created.push(createdAccount);
    }

    return { created, existing };
  });

  console.log(`Entreprise ${enterpriseId} : ${result.created.length} compte(s) créé(s), ${result.existing.length} déjà présent(s).`);
  result.created.forEach((account) => console.log(`Créé : ${account.code} — ${account.label} (${account.type})`));
  result.existing.forEach((account) => {
    const typeNote = account.type === account.expectedType ? '' : ` [type existant ${account.type}, attendu ${account.expectedType}]`;
    console.log(`Déjà présent : ${account.code} — ${account.label}${typeNote}`);
  });
  console.log('Les soldes initiaux sont à zéro ; aucun montant de la balance source n’a été importé.');
}

main()
  .catch((error) => {
    console.error('Import du plan comptable interrompu :', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
