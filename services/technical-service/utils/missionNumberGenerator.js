const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateMissionNumber(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `MIS-${year}${month}`;
}

async function getNextMissionNumber() {
  const prefix = generateMissionNumber();
  
  const lastMission = await prisma.mission.findFirst({
    where: {
      numeroMission: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroMission: 'desc'
    }
  });

  let sequence = 1;
  if (lastMission) {
    const lastSequence = parseInt(lastMission.numeroMission.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

module.exports = { generateMissionNumber, getNextMissionNumber };
