// Dependances partagees des gestionnaires de contacts.
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

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const normalizeContactPayload = (payload) => ({
  ...payload,
  civilite: normalizeOptionalString(payload.civilite),
  nom: typeof payload.nom === 'string' ? payload.nom.trim() : payload.nom,
  prenom: typeof payload.prenom === 'string' ? payload.prenom.trim() : payload.prenom,
  email: normalizeOptionalString(payload.email),
  emailSecondaire: normalizeOptionalString(payload.emailSecondaire),
  telephone: normalizeOptionalString(payload.telephone),
  mobile: normalizeOptionalString(payload.mobile),
  poste: normalizeOptionalString(payload.poste),
  departement: normalizeOptionalString(payload.departement),
  notes: normalizeOptionalString(payload.notes)
});

module.exports = { prisma, logger, validationResult, normalizeOptionalString, normalizeContactPayload };
