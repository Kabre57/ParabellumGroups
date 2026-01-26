/**
 * Generate unique purchase numbers in formats:
 * - DA-YYYYMM-NNNN for Demande Achat
 * - BC-YYYYMM-NNNN for Bon Commande
 * Examples: DA-202601-0001, BC-202601-0001
 */

async function generateDemandeAchatNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `DA-${year}${month}`;

  // Find the last demande achat number for this month
  const lastDemande = await prisma.demandeAchat.findFirst({
    where: {
      numeroDemande: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroDemande: 'desc'
    }
  });

  let sequence = 1;
  
  if (lastDemande) {
    // Extract sequence number from last demande
    const lastNumber = lastDemande.numeroDemande.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  // Format sequence with leading zeros (4 digits)
  const sequenceFormatted = String(sequence).padStart(4, '0');
  
  return `${prefix}-${sequenceFormatted}`;
}

async function generateBonCommandeNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `BC-${year}${month}`;

  // Find the last bon commande number for this month
  const lastBon = await prisma.bonCommande.findFirst({
    where: {
      numeroBon: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroBon: 'desc'
    }
  });

  let sequence = 1;
  
  if (lastBon) {
    // Extract sequence number from last bon
    const lastNumber = lastBon.numeroBon.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  // Format sequence with leading zeros (4 digits)
  const sequenceFormatted = String(sequence).padStart(4, '0');
  
  return `${prefix}-${sequenceFormatted}`;
}

module.exports = { 
  generateDemandeAchatNumber, 
  generateBonCommandeNumber 
};
