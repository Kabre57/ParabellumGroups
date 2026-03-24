/**
 * Generate unique purchase numbers in formats:
 * - DPA-YYYYMM-NNNN for Devis / Demande Achat
 * - PFA-YYYYMM-NNNN for Proforma Achat
 * - BCA-YYYYMM-NNNN for Bon Commande
 * Examples: DPA-202601-0001, PFA-202601-0001, BCA-202601-0001
 */

async function generateDemandeAchatNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `DPA-${year}${month}`;

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
  const prefix = `BCA-${year}${month}`;

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

async function generateProformaNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PFA-${year}${month}`;

  const lastProforma = await prisma.proforma.findFirst({
    where: {
      numeroProforma: {
        startsWith: prefix,
      },
    },
    orderBy: {
      numeroProforma: 'desc',
    },
  });

  let sequence = 1;

  if (lastProforma) {
    const lastNumber = lastProforma.numeroProforma.split('-')[2];
    sequence = parseInt(lastNumber, 10) + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

module.exports = { 
  generateDemandeAchatNumber, 
  generateBonCommandeNumber,
  generateProformaNumber,
};
