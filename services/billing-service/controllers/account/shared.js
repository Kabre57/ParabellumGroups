// Outils communs pour valider les données et borner l’import par entreprise.
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const {
  amount,
  accountTypeFromInput,
  ensureAccountingAccountsWriteAccess,
  ensureAccountingReadAccess,
  getDynamicAccountTemplate,
  serializeAccountingAccount,
} = require('../../utils/accounting');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  parseEnterpriseId,
  resolveEnterpriseContext,
} = require('../../utils/enterpriseScope');

const prisma = new PrismaClient();
const ACCOUNT_IMPORT_MAX_ROWS = 2000;
const ACCOUNT_IMPORT_HEADERS = ['Code', 'Libellé', 'Type', 'Description', 'Solde initial'];
const ACCOUNT_IMPORT_TYPES = new Set(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);

const accountImportError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeImportHeader = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const normalizeImportType = (value) => {
  const normalized = normalizeImportHeader(value).toUpperCase();
  const aliases = {
    ACTIF: 'ASSET',
    PASSIF: 'LIABILITY',
    CAPITAUXPROPRES: 'EQUITY',
    PRODUIT: 'REVENUE',
    PRODUITS: 'REVENUE',
    CHARGE: 'EXPENSE',
    CHARGES: 'EXPENSE',
  };
  // Le type est choisi par l'utilisateur dans le fichier : le code du compte
  // ne doit jamais modifier cette sélection.
  const type = aliases[normalized] || normalized;
  return ACCOUNT_IMPORT_TYPES.has(type) ? type : null;
};

const parseImportBalance = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let normalized = String(value).trim().replace(/[\s\u00a0']/g, '');
  if (!normalized) return 0;
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma !== -1 && dot !== -1) {
    normalized = comma > dot
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (comma !== -1) {
    normalized = normalized.replace(',', '.');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const requireActiveEnterpriseForImport = async (req) => {
  const requestedScopes = [req.query?.enterpriseScope, req.body?.enterpriseScope]
    .filter((scope) => scope !== undefined && scope !== null && String(scope).trim() !== '')
    .map((scope) => String(scope).trim().toLowerCase());
  if (requestedScopes.includes('consolidated')) {
    throw accountImportError("L'import du plan comptable est indisponible en vue consolidée.", 403);
  }
  if (!requestedScopes.length || requestedScopes.some((scope) => scope !== 'active')) {
    throw accountImportError("Confirmez le périmètre de l'entreprise active avant de poursuivre.", 400);
  }

  const activeEnterpriseId = parseEnterpriseId(req.headers?.['x-enterprise-id']);
  if (!activeEnterpriseId) {
    throw accountImportError('Sélectionnez une entreprise active avant d’importer le plan comptable.');
  }

  const rawExpectedEnterpriseId = req.query?.expectedEnterpriseId;
  const expectedEnterpriseId = parseEnterpriseId(rawExpectedEnterpriseId);
  if (rawExpectedEnterpriseId !== undefined && rawExpectedEnterpriseId !== '' && !expectedEnterpriseId) {
    throw accountImportError("L'identifiant d'entreprise de l'aperçu est invalide.");
  }
  if (expectedEnterpriseId && expectedEnterpriseId !== activeEnterpriseId) {
    throw accountImportError("L'entreprise active a changé depuis l'aperçu. Vérifiez à nouveau le fichier.", 409);
  }

  const context = await resolveEnterpriseContext(req, activeEnterpriseId);
  if (context.enterpriseId !== activeEnterpriseId) {
    throw accountImportError("L'entreprise active ne correspond pas au périmètre autorisé.", 403);
  }
  return context;
};

const parseImportCorrections = (rawCorrections) => {
  if (!rawCorrections) return new Map();

  let corrections;
  try {
    corrections = typeof rawCorrections === 'string' ? JSON.parse(rawCorrections) : rawCorrections;
  } catch (_error) {
    throw accountImportError('Les corrections de l’aperçu sont invalides. Vérifiez à nouveau le fichier.');
  }
  if (!Array.isArray(corrections)) {
    throw accountImportError('Les corrections de l’aperçu sont invalides. Vérifiez à nouveau le fichier.');
  }

  const allowedFields = new Set(['code', 'label', 'type', 'description', 'openingBalance']);
  const correctionsByLine = new Map();
  corrections.forEach((correction) => {
    const line = Number(correction?.line);
    if (!Number.isInteger(line) || line < 2 || !correction?.values || typeof correction.values !== 'object') {
      throw accountImportError('Une correction de ligne est invalide. Vérifiez à nouveau le fichier.');
    }
    const values = {};
    Object.entries(correction.values).forEach(([field, value]) => {
      if (!allowedFields.has(field)) return;
      values[field] = value;
    });
    correctionsByLine.set(line, values);
  });
  return correctionsByLine;
};

const parseAccountingAccountWorkbook = (file, rawCorrections) => {
  if (!file?.buffer) throw accountImportError('Veuillez sélectionner un fichier Excel.');

  let workbook;
  try {
    workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false });
  } catch (_error) {
    throw accountImportError('Le fichier Excel est illisible ou endommagé.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw accountImportError('Le fichier Excel ne contient aucune feuille exploitable.');

  const grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
    blankrows: true,
  });
  if (grid.length < 2 || !Array.isArray(grid[0])) {
    throw accountImportError('Le fichier Excel ne contient aucun compte à importer.');
  }

  const headers = grid[0].map(normalizeImportHeader);
  if (headers.some((header) => header.includes('entreprise') || header.includes('enterprise') || header.includes('entite') || header === 'company')) {
    throw accountImportError('Le fichier ne doit pas contenir de colonne entreprise : l’entreprise active est utilisée automatiquement.');
  }
  const indexes = {
    code: headers.findIndex((header) => ['code', 'numerocompte'].includes(header)),
    label: headers.findIndex((header) => ['libelle', 'intitule', 'nomducompte'].includes(header)),
    type: headers.findIndex((header) => ['type', 'nature'].includes(header)),
    description: headers.findIndex((header) => header === 'description'),
    openingBalance: headers.findIndex((header) => ['soldeinitial', 'soldeouverture'].includes(header)),
  };
  const missingHeaders = ['code', 'label', 'type'].filter((key) => indexes[key] === -1);
  if (missingHeaders.length) {
    throw accountImportError(`Colonnes obligatoires manquantes : ${missingHeaders.join(', ')}. Téléchargez le modèle fourni.`);
  }

  const dataRows = grid.slice(1)
    .map((row, index) => ({ row, line: index + 2 }))
    .filter(({ row }) => row.some((cell) => String(cell ?? '').trim() !== ''));
  if (!dataRows.length) throw accountImportError('Le fichier Excel ne contient aucun compte à importer.');
  if (dataRows.length > ACCOUNT_IMPORT_MAX_ROWS) {
    throw accountImportError(`Le fichier dépasse la limite de ${ACCOUNT_IMPORT_MAX_ROWS} comptes par import.`);
  }
  const correctionsByLine = parseImportCorrections(rawCorrections);

  return dataRows.map(({ row, line }) => {
    const readCell = (key) => indexes[key] === -1 ? '' : row[indexes[key]];
    const correction = correctionsByLine.get(line) || {};
    const readValue = (key) => Object.prototype.hasOwnProperty.call(correction, key) ? correction[key] : readCell(key);
    const code = String(readValue('code') ?? '').trim();
    const label = String(readValue('label') ?? '').trim();
    const type = normalizeImportType(readValue('type'));
    const rawDescription = String(readValue('description') ?? '').trim();
    const openingBalance = parseImportBalance(readValue('openingBalance'));
    const errors = [];

    if (!code) errors.push('Le code est obligatoire.');
    if (!label) errors.push('Le libellé est obligatoire.');
    if (!type) errors.push('Type invalide : utilisez Actif, Passif, Capitaux propres, Produit ou Charge.');
    if (openingBalance === null) errors.push('Le solde initial doit être un nombre valide.');

    return {
      line,
      code,
      label,
      type,
      description: rawDescription || null,
      openingBalance: openingBalance ?? 0,
      errors,
      status: errors.length ? 'INVALID' : 'IMPORTABLE',
    };
  });
};

const validateAccountingAccountImport = async (rows, enterpriseId) => {
  const countsByCode = new Map();
  rows.forEach((row) => {
    if (row.code) {
      countsByCode.set(row.code, (countsByCode.get(row.code) || 0) + 1);
    }
  });
  rows.forEach((row) => {
    if (row.code && countsByCode.get(row.code) > 1) {
      row.status = 'INVALID';
      if (!row.errors.includes('Ce code apparaît plusieurs fois dans le fichier.')) {
        row.errors.push('Ce code apparaît plusieurs fois dans le fichier.');
      }
    }
  });

  const candidateCodes = [...new Set(rows.filter((row) => row.status === 'IMPORTABLE').map((row) => row.code))];
  const existingAccounts = candidateCodes.length
    ? await prisma.accountingAccount.findMany({
        where: { enterpriseId, code: { in: candidateCodes } },
        select: { code: true },
      })
    : [];
  const existingCodes = new Set(existingAccounts.map((account) => account.code));
  rows.forEach((row) => {
    if (row.status === 'IMPORTABLE' && existingCodes.has(row.code)) {
      row.status = 'EXISTING';
    }
  });

  return {
    rows,
    existingCodes: [...existingCodes],
    summary: {
      total: rows.length,
      importable: rows.filter((row) => row.status === 'IMPORTABLE').length,
      existing: rows.filter((row) => row.status === 'EXISTING').length,
      invalid: rows.filter((row) => row.status === 'INVALID').length,
    },
  };
};

const getAccountImportAccessError = (req) => ensureAccountingAccountsWriteAccess(
  req,
  "Vous n'avez pas la permission d'importer le plan comptable"
);module.exports = {
  ACCOUNT_IMPORT_HEADERS,
  ACCOUNT_IMPORT_MAX_ROWS,
  ACCOUNT_IMPORT_TYPES,
  XLSX,
  accountImportError,
  accountTypeFromInput,
  amount,
  applyEnterpriseScope,
  assertEnterpriseInScope,
  ensureAccountingAccountsWriteAccess,
  ensureAccountingReadAccess,
  getAccountImportAccessError,
  getDynamicAccountTemplate,
  normalizeImportHeader,
  normalizeImportType,
  parseAccountingAccountWorkbook,
  parseEnterpriseId,
  parseImportBalance,
  parseImportCorrections,
  prisma,
  requireActiveEnterpriseForImport,
  resolveEnterpriseContext,
  serializeAccountingAccount,
  validateAccountingAccountImport,
};
