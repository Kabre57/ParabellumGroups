const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateMissionOrderPrefix(date = new Date()) {
  const year = date.getFullYear();
  return `OM-${year}`;
}

async function getNextMissionOrderNumber(date = new Date(), client = prisma) {
  const prefix = generateMissionOrderPrefix(date);

  const lastOrder = await client.ordreMission.findFirst({
    where: {
      numeroOrdre: {
        startsWith: prefix,
      },
    },
    orderBy: {
      numeroOrdre: 'desc',
    },
  });

  let sequence = 1;
  if (lastOrder?.numeroOrdre) {
    const lastSequence = parseInt(lastOrder.numeroOrdre.split('-')[2], 10);
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

module.exports = { getNextMissionOrderNumber };
