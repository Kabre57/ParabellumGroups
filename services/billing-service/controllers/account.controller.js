const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const {
  amount,
  accountTypeFromInput,
  ensureAccountingAccountsWriteAccess,
  ensureAccountingReadAccess,
  getDynamicAccountTemplate,
  serializeAccountingAccount,
} = require('../utils/accounting');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  parseEnterpriseId,
  resolveEnterpriseContext,
} = require('../utils/enterpriseScope');

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

const parseAccountingAccountWorkbook = (file) => {
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
    blankrows: false,
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

  const dataRows = grid.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
  if (!dataRows.length) throw accountImportError('Le fichier Excel ne contient aucun compte à importer.');
  if (dataRows.length > ACCOUNT_IMPORT_MAX_ROWS) {
    throw accountImportError(`Le fichier dépasse la limite de ${ACCOUNT_IMPORT_MAX_ROWS} comptes par import.`);
  }

  return dataRows.map((row, index) => {
    const readCell = (key) => indexes[key] === -1 ? '' : row[indexes[key]];
    const code = String(readCell('code') ?? '').trim();
    const label = String(readCell('label') ?? '').trim();
    const type = normalizeImportType(readCell('type'));
    const rawDescription = String(readCell('description') ?? '').trim();
    const openingBalance = parseImportBalance(readCell('openingBalance'));
    const errors = [];

    if (!code) errors.push('Le code est obligatoire.');
    if (!label) errors.push('Le libellé est obligatoire.');
    if (!type) errors.push('Type invalide : utilisez Actif, Passif, Capitaux propres, Produit ou Charge.');
    if (openingBalance === null) errors.push('Le solde initial doit être un nombre valide.');

    return {
      line: index + 2,
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
);

exports.downloadAccountingAccountImportTemplate = async (req, res) => {
  try {
    const readAccessError = ensureAccountingReadAccess(req);
    const manageAccessError = ensureAccountingAccountsWriteAccess(req);
    if (readAccessError && manageAccessError) {
      return res.status(readAccessError.status).json(readAccessError.body);
    }

    const workbook = XLSX.utils.book_new();
    const accountsSheet = XLSX.utils.aoa_to_sheet([ACCOUNT_IMPORT_HEADERS]);
    accountsSheet['!cols'] = [
      { wch: 18 }, { wch: 38 }, { wch: 22 }, { wch: 52 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Plan comptable');

    const guideSheet = XLSX.utils.aoa_to_sheet([
      ['Guide d’import du plan comptable'],
      ['Colonne', 'Obligatoire', 'Règle'],
      ['Code', 'Oui', 'Code unique dans le fichier et dans l’entreprise active. Conservez les codes au format texte.'],
      ['Libellé', 'Oui', 'Nom du compte comptable.'],
      ['Type', 'Oui', 'Le type saisi par l’utilisateur est conservé : Actif, Passif, Capitaux propres, Produit ou Charge (ou ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE). Le code du compte ne change pas le type.'],
      ['Description', 'Non', 'Description ou précision comptable.'],
      ['Solde initial', 'Non', 'Nombre, avec virgule ou point décimal. Valeur par défaut : 0.'],
      ['', '', 'Les comptes déjà présents sont ignorés. Aucune donnée existante n’est remplacée ou supprimée.'],
      ['', '', 'L’entreprise est déterminée par le sélecteur de l’application. Ne pas ajouter de colonne entreprise.'],
    ]);
    guideSheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 105 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guide');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="modele-plan-comptable.xlsx"');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Erreur génération modèle du plan comptable:', error.message);
    return res.status(500).json({ success: false, message: 'Erreur lors de la génération du modèle Excel.' });
  }
};

exports.previewAccountingAccountImport = async (req, res) => {
  try {
    const accessError = getAccountImportAccessError(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const enterprise = await requireActiveEnterpriseForImport(req);
    const parsedRows = parseAccountingAccountWorkbook(req.file);
    const preview = await validateAccountingAccountImport(parsedRows, enterprise.enterpriseId);
    return res.json({
      success: true,
      data: { enterpriseId: enterprise.enterpriseId, enterpriseName: enterprise.enterpriseName, ...preview },
    });
  } catch (error) {
    console.error('Erreur aperçu import plan comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la lecture du fichier Excel.',
    });
  }
};

exports.importAccountingAccounts = async (req, res) => {
  try {
    const accessError = getAccountImportAccessError(req);
    if (accessError) return res.status(accessError.status).json(accessError.body);

    const enterprise = await requireActiveEnterpriseForImport(req);
    const parsedRows = parseAccountingAccountWorkbook(req.file);
    const preview = await validateAccountingAccountImport(parsedRows, enterprise.enterpriseId);
    const rowsToImport = preview.rows.filter((row) => row.status === 'IMPORTABLE');
    if (!rowsToImport.length) {
      return res.status(400).json({
        success: false,
        message: 'Aucun compte importable : corrigez les lignes invalides ou utilisez une entreprise sans ces codes.',
        data: { summary: preview.summary, rows: preview.rows },
      });
    }

    const importResult = await prisma.$transaction(async (tx) => {
      const codes = rowsToImport.map((row) => row.code);
      const existingNow = await tx.accountingAccount.findMany({
        where: { enterpriseId: enterprise.enterpriseId, code: { in: codes } },
        select: { code: true },
      });
      const existingCodes = new Set(existingNow.map((account) => account.code));
      const freshRows = rowsToImport.filter((row) => !existingCodes.has(row.code));
      const inserted = freshRows.length
        ? await tx.accountingAccount.createMany({
            skipDuplicates: true,
            data: freshRows.map((row) => {
              const openingBalance = amount(row.openingBalance);
              const dynamicTemplate = getDynamicAccountTemplate(row.code);
              return {
                code: row.code,
                label: row.label,
                type: row.type,
                description: row.description,
                openingBalance,
                currentBalance: openingBalance,
                isDynamic: Boolean(dynamicTemplate),
                formula: dynamicTemplate?.formula || null,
                enterpriseId: enterprise.enterpriseId,
                createdByUserId: req.user?.userId ? String(req.user.userId) : null,
                createdByEmail: req.user?.email || null,
              };
            }),
          })
        : { count: 0 };

      return {
        imported: inserted.count,
        skippedExistingAtImport: codes.length - inserted.count,
      };
    });

    const skippedExisting = preview.summary.existing + importResult.skippedExistingAtImport;
    return res.status(201).json({
      success: true,
      message: `Import terminé : ${importResult.imported} compte(s) ajouté(s).`,
      data: {
        enterpriseName: enterprise.enterpriseName,
        imported: importResult.imported,
        skippedExisting,
        skippedInvalid: preview.summary.invalid,
        existingCodes: preview.rows.filter((row) => row.status === 'EXISTING').map((row) => row.code),
        errors: preview.rows.filter((row) => row.status === 'INVALID').map(({ line, code, errors }) => ({ line, code, errors })),
      },
    });
  } catch (error) {
    console.error('Erreur import plan comptable:', error.message);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec ce code a été ajouté pendant l’import. Relancez l’aperçu avant de réessayer.',
      });
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de l’import du plan comptable.',
    });
  }
};

exports.getAllAccounts = async (req, res) => {
  try {
    const accessError = ensureAccountingReadAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const accounts = await prisma.accountingAccount.findMany({
      where: await applyEnterpriseScope({
        req,
        where: { isActive: true },
      }),
      orderBy: [{ code: 'asc' }],
    });

    return res.json({
      success: true,
      data: accounts.map(serializeAccountingAccount),
    });
  } catch (error) {
    console.error('Erreur récupération plan comptable:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du plan comptable',
    });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingAccountsWriteAccess(req, 'Vous n avez pas la permission de créer un compte comptable');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { code, label, type, description, openingBalance } = req.body;
    const normalizedCode = String(code || '').trim();
    const normalizedLabel = String(label || '').trim();
    const normalizedType = accountTypeFromInput(type);

    if (!normalizedCode || !normalizedLabel || !normalizedType) {
      return res.status(400).json({
        success: false,
        message: 'Le code, le libellé et le type du compte sont obligatoires',
      });
    }

    const { enterpriseId } = await resolveEnterpriseContext(req, req.body?.enterpriseId);
    if (!enterpriseId) {
      return res.status(400).json({ success: false, message: 'Choisissez une entreprise active avant de crÃ©er un compte comptable.' });
    }

    const existing = await prisma.accountingAccount.findFirst({
      where: {
        code: normalizedCode,
        enterpriseId,
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec ce code existe déjà',
      });
    }

    const initialBalance = amount(openingBalance);
    const dynamicTemplate = getDynamicAccountTemplate(normalizedCode);

    const account = await prisma.accountingAccount.create({
      data: {
        code: normalizedCode,
        label: normalizedLabel,
        type: normalizedType,
        description: description ? String(description).trim() : null,
        openingBalance: initialBalance,
        currentBalance: initialBalance,
        isDynamic: Boolean(dynamicTemplate),
        formula: dynamicTemplate?.formula || null,
        enterpriseId,
        createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        createdByEmail: req.user?.email || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: serializeAccountingAccount(account),
      message: dynamicTemplate
        ? 'Compte comptable créé avec succès. Les calculs automatiques ont été activés pour ce code.'
        : 'Compte comptable créé avec succès',
    });
  } catch (error) {
    console.error('Erreur création compte comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la création du compte comptable',
    });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingAccountsWriteAccess(req, 'Vous n avez pas la permission de modifier un compte comptable');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { id } = req.params;
    const { code, label, type, description, openingBalance, isActive } = req.body;

    const account = await prisma.accountingAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Compte comptable introuvable',
      });
    }

    await assertEnterpriseInScope(req, account.enterpriseId, "Vous n'avez pas acces a ce compte comptable.");

    const data = {};
    if (code) {
      const normalizedCode = String(code).trim();
      if (normalizedCode && normalizedCode !== account.code) {
        const existing = await prisma.accountingAccount.findFirst({
          where: {
            code: normalizedCode,
            enterpriseId: account.enterpriseId,
            id: { not: account.id },
          },
          select: { id: true },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Un compte avec ce code existe déjà',
          });
        }
        data.code = normalizedCode;
      }
    }

    if (label) {
      data.label = String(label).trim();
    }

    if (typeof description !== 'undefined') {
      data.description = description ? String(description).trim() : null;
    }

    const normalizedType = accountTypeFromInput(type);
    if (normalizedType) {
      data.type = normalizedType;
    }

    if (typeof openingBalance !== 'undefined') {
      const normalizedOpening = amount(openingBalance);
      data.openingBalance = normalizedOpening;
      data.currentBalance = normalizedOpening;
    }

    if (typeof isActive !== 'undefined') {
      data.isActive = Boolean(isActive);
    }

    const nextCode = data.code || account.code;
    const dynamicTemplate = getDynamicAccountTemplate(nextCode);

    if (dynamicTemplate) {
      data.isDynamic = true;
      data.formula = dynamicTemplate.formula;
    } else if (data.code && account.isDynamic) {
      data.isDynamic = false;
      data.formula = null;
    }

    const updated = await prisma.accountingAccount.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: serializeAccountingAccount(updated),
      message: 'Compte comptable mis à jour',
    });
  } catch (error) {
    console.error('Erreur mise à jour compte comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la mise à jour du compte comptable',
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const accessError = ensureAccountingAccountsWriteAccess(req, 'Vous n avez pas la permission de supprimer un compte comptable');
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { id } = req.params;
    const account = await prisma.accountingAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            journalLines: true,
            mappings: true,
            familyRules: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Compte comptable introuvable',
      });
    }

    await assertEnterpriseInScope(req, account.enterpriseId, "Vous n'avez pas acces a ce compte comptable.");

    const hasDependencies =
      account._count.journalLines > 0 ||
      account._count.mappings > 0 ||
      account._count.familyRules > 0;

    if (hasDependencies) {
      await prisma.accountingAccount.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: 'Le compte est déjà utilisé. Il a été désactivé au lieu d être supprimé.',
      });
    }

    await prisma.accountingAccount.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Compte comptable supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression compte comptable:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la suppression du compte comptable',
    });
  }
};
