/**
 * Generate unique contract number in format CTR-YYYYMM-NNNN
 * Example: CTR-202601-0001
 */
async function generateContratNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CTR-${year}${month}`;

  // Find the last contract number for this month
  const lastContrat = await prisma.contrat.findFirst({
    where: {
      numeroContrat: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroContrat: 'desc'
    }
  });

  let sequence = 1;
  
  if (lastContrat) {
    // Extract sequence number from last contract
    const lastNumber = lastContrat.numeroContrat.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  // Format sequence with leading zeros (4 digits)
  const sequenceFormatted = String(sequence).padStart(4, '0');
  
  return `${prefix}-${sequenceFormatted}`;
}

module.exports = { generateContratNumber };
