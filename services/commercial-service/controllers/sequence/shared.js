// Acces a la base de donnees partage entre les sequences.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = { prisma };
