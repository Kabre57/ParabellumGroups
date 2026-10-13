const { PrismaClient } = require('@prisma/client');
const { VALID_INTERVENTION_STATUSES, isLockedIntervention } = require('../../services/interventionRules');

const prisma = new PrismaClient();
const VALID_STATUSES = VALID_INTERVENTION_STATUSES;

// Charge l’intervention et, si nécessaire, les techniciens associés.
const getInterventionLockState = (id, includeRelations = false) =>
  prisma.intervention.findUnique({
    where: { id },
    include: includeRelations ? { techniciens: true } : undefined,
  });

module.exports = { prisma, VALID_STATUSES, getInterventionLockState, isLockedIntervention };
