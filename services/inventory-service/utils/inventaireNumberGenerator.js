const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateInventaireNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}`;

  // Trouver le dernier numéro du mois
  const lastInventaire = await prisma.inventaire.findFirst({
    where: {
      numeroInventaire: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroInventaire: 'desc'
    }
  });

  let nextNumber = 1;
  if (lastInventaire) {
    const lastNumber = parseInt(lastInventaire.numeroInventaire.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

module.exports = { generateInventaireNumber };
