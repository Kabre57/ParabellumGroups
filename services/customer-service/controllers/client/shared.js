// Outils communs de normalisation, de portée entreprise et d’import client.
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const winston = require('winston');
const { syncMissionsFromClientAddress } = require('../../services/technicalMissionSync');

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const normalizeOptionalValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const toJsonSafe = (value) =>
  JSON.parse(
    JSON.stringify(value, (_, nestedValue) => {
      if (nestedValue instanceof Date) {
        return nestedValue.toISOString();
      }

      if (nestedValue && typeof nestedValue === 'object' && typeof nestedValue.toJSON === 'function') {
        return nestedValue.toJSON();
      }

      return nestedValue;
    })
  );

const isAdminLike = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return role === 'admin' || role === 'super_admin';
};

const parseScopedInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildClientScopeWhere = (req, explicitEnterpriseId, explicitServiceId) => {
  const where = {};
  const requestedEnterpriseId = parseScopedInteger(explicitEnterpriseId);
  const requestedServiceId = parseScopedInteger(explicitServiceId);
  const userEnterpriseId = parseScopedInteger(req.user?.enterpriseId);
  const userServiceId = parseScopedInteger(req.user?.serviceId);

  if (requestedEnterpriseId) {
    where.enterpriseId = requestedEnterpriseId;
  } else if (!isAdminLike(req.user) && userEnterpriseId) {
    where.enterpriseId = userEnterpriseId;
  }

  if (requestedServiceId) {
    where.serviceId = requestedServiceId;
  } else if (!isAdminLike(req.user) && userServiceId) {
    where.serviceId = userServiceId;
  }

  return where;
};

const normalizeImportKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const normalizeImportValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
};

const buildImportRowMap = (row) =>
  Object.entries(row || {}).reduce((map, [key, value]) => {
    map[normalizeImportKey(key)] = value;
    return map;
  }, {});

const pickImportValue = (rowMap, aliases) => {
  for (const alias of aliases) {
    const value = normalizeImportValue(rowMap[normalizeImportKey(alias)]);
    if (value !== undefined) return value;
  }

  return undefined;
};

const parseImportNumber = (value, fieldName) => {
  const normalized = normalizeImportValue(value);
  if (normalized === undefined) return undefined;
  const parsed = Number(normalized.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} doit etre un nombre valide`);
  }
  return parsed;
};

const parseImportInteger = (value, fieldName) => {
  const parsed = parseImportNumber(value, fieldName);
  if (parsed === undefined) return undefined;
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} doit etre un nombre entier`);
  }
  return parsed;
};

const parseImportEnum = (value, allowedValues, fieldName) => {
  const normalized = normalizeImportValue(value);
  if (normalized === undefined) return undefined;
  const candidate = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!allowedValues.includes(candidate)) {
    throw new Error(`${fieldName} invalide: ${normalized}`);
  }

  return candidate;
};

const compactImportData = (data) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});

const isValidImportEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

/**
 * Generate unique client reference in format CLI-YYYYMM-NNNN
 */
async function generateClientReference() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `CLI-${year}${month}`;

  const lastClient = await prisma.client.findFirst({
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
  if (lastClient) {
    const lastNumber = lastClient.reference.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  const sequenceFormatted = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceFormatted}`;
}

/**
 * Get all clients with advanced filtering, pagination and search
 */

module.exports = { winston, validationResult, syncMissionsFromClientAddress, prisma, logger, normalizeOptionalValue, toJsonSafe, isAdminLike, parseScopedInteger, buildClientScopeWhere, normalizeImportKey, normalizeImportValue, buildImportRowMap, pickImportValue, parseImportNumber, parseImportInteger, parseImportEnum, compactImportData, isValidImportEmail };
