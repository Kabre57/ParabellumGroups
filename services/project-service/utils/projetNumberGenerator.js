/**
 * Génère un numéro de projet unique au format PRJ-YYYYMM-NNNN
 * @param {Object} prisma - Instance Prisma Client
 * @returns {Promise<string>} Numéro de projet généré
 */
async function generateProjetNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PRJ-${year}${month}`;

  // Trouver le dernier numéro du mois
  const lastProjet = await prisma.projet.findFirst({
    where: {
      numeroProjet: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroProjet: 'desc'
    }
  });

  let sequence = 1;
  if (lastProjet) {
    const lastSequence = parseInt(lastProjet.numeroProjet.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const numeroProjet = `${prefix}-${String(sequence).padStart(4, '0')}`;
  return numeroProjet;
}

module.exports = { generateProjetNumber };
