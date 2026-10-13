// Dependances et generateurs partages entre les parcours des contrats.
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const winston = require('winston');

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Generate unique contract number
 */
async function generateContratNumber(prisma) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CTR-${year}${month}`;

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
    const lastNumber = lastContrat.numeroContrat.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceFormatted = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceFormatted}`;
}

/**
 * Generate contract reference
 */
async function generateContratReference() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `REF-${year}${month}`;

  const lastContrat = await prisma.contrat.findFirst({
    where: {
      reference: {
        startsWith: prefix
      }
    },
    orderBy: {
      reference: 'desc'
    }
  });

  let sequence = 1;
  if (lastContrat) {
    const lastNumber = lastContrat.reference.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceFormatted = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceFormatted}`;
}

/**
 * Get all contracts with advanced filtering
 */

module.exports = { prisma, logger, validationResult, generateContratNumber, generateContratReference };
