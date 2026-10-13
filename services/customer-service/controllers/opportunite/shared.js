// Dependances et outils communs aux parcours d?opportunit?.
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const winston = require('winston');
const { generateContratNumber } = require('../../utils/contratNumberGenerator');

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
 * Get all opportunities with filtering
 */

module.exports = { PrismaClient, validationResult, generateContratNumber, winston, prisma, logger };
