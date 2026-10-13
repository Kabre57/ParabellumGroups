// Dependances communes et statuts des rapports techniques.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['BROUILLON', 'SOUMIS', 'VALIDE', 'REJETE'];

module.exports = { prisma, VALID_STATUSES };
