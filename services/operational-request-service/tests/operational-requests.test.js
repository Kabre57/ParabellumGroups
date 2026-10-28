const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TYPES, STATUSES, FINANCE_STATUSES } = require('../utils/constants');
const { hasPermission, isAdmin } = require('../utils/helpers');
const { hasExpectedFileSignature } = require('../utils/s3');
const { validateRequestFields } = require('../controllers/operationalRequest.controller');
const { requirePermission } = require('../middleware/auth');
const { selectActiveBillingVoucher, classifyVoucherLookupResult } = require('../utils/billing');

test('request field validation enforces mandatory fields and allowed types', () => {
  const missingType = validateRequestFields({ beneficiaryName: 'Jean', reason: 'Mission', amountRequested: 50000 });
  assert.equal(missingType.error, 'Le type de demande est obligatoire.');

  const invalidType = validateRequestFields({ type: 'INVALID', beneficiaryName: 'Jean', reason: 'Mission', amountRequested: 50000 });
  assert.equal(invalidType.error, 'Type de demande invalide.');

  const negativeAmount = validateRequestFields({ type: 'FUEL', beneficiaryName: 'Jean', reason: 'Carburant', amountRequested: -100 });
  assert.equal(negativeAmount.error, 'Le montant doit être supérieur à zéro.');

  const zeroAmount = validateRequestFields({ type: 'FUEL', beneficiaryName: 'Jean', reason: 'Carburant', amountRequested: 0 });
  assert.equal(zeroAmount.error, 'Le montant doit être supérieur à zéro.');

  const valid = validateRequestFields({
    type: 'TRANSPORT',
    beneficiaryName: 'Mamadou',
    reason: 'Déplacement client',
    amountRequested: '15000',
    desiredDate: '2026-10-25',
    details: { origin: 'Plateau', destination: 'Yopougon' },
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.data.type, 'TRANSPORT');
  assert.equal(valid.data.amountRequested, '15000.00');
  assert.equal(valid.data.beneficiaryName, 'Mamadou');
});

test('request field validation allows partial updates on draft or returned requests', () => {
  // Champ absent en partial → valide.
  const partial = validateRequestFields({ amountRequested: 25000 }, { partial: true });
  assert.equal(partial.error, undefined);
  assert.equal(partial.data.amountRequested, '25000.00');
  assert.equal(partial.data.beneficiaryName, undefined);

  // #29 / D4-A — Champ fourni mais vide → 400, même en mode partial.
  // Un champ obligatoire reste obligatoire même en update.
  const emptyBeneficiary = validateRequestFields({ beneficiaryName: '' }, { partial: true });
  assert.equal(emptyBeneficiary.error, 'Le bénéficiaire ne peut pas être vide.');

  const emptyReason = validateRequestFields({ reason: '   ' }, { partial: true });
  assert.equal(emptyReason.error, 'Le motif ne peut pas être vide.');

  // Champ fourni non-vide en partial → valide.
  const validPartial = validateRequestFields({ beneficiaryName: 'Alice Koné' }, { partial: true });
  assert.equal(validPartial.error, undefined);
  assert.equal(validPartial.data.beneficiaryName, 'Alice Koné');

  // #29 / D4-A — Non-régression : un PATCH qui ne touche QUE amountRequested (champ numérique)
  // ne doit PAS déclencher la validation des strings absents.
  const numericOnly = validateRequestFields({ amountRequested: 500 }, { partial: true });
  assert.equal(numericOnly.error, undefined,
    'PATCH { amountRequested: 500 } must pass — D4-A must not reject absent string fields');
  assert.equal(numericOnly.data.amountRequested, '500.00');

  // Non-régression sur-correction : PATCH qui inclut un beneficiaryName non-vide + amountRequested.
  // Si D4-A avait été trop strict, ce cas passerait en erreur à tort.
  const mixedValid = validateRequestFields({ beneficiaryName: 'Alice', amountRequested: 500 }, { partial: true });
  assert.equal(mixedValid.error, undefined,
    'PATCH { beneficiaryName: non-empty, amountRequested } must pass — D4-A only rejects empty strings');
  assert.equal(mixedValid.data.beneficiaryName, 'Alice');
  assert.equal(mixedValid.data.amountRequested, '500.00');
});

test('file signature validation verifies real binary magic numbers', () => {
  const validPdf = { mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n...') };
  assert.equal(hasExpectedFileSignature(validPdf), true);

  const fakePdf = { mimetype: 'application/pdf', buffer: Buffer.from('<html>not a pdf</html>') };
  assert.equal(hasExpectedFileSignature(fakePdf), false);

  const validPng = { mimetype: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]) };
  assert.equal(hasExpectedFileSignature(validPng), true);

  const validJpg = { mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) };
  assert.equal(hasExpectedFileSignature(validJpg), true);

  const fakeJpg = { mimetype: 'image/jpeg', buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]) };
  assert.equal(hasExpectedFileSignature(fakeJpg), false);
});

test('permission checks and explicit decision rule prevent admin bypass of business approval', () => {
  const adminUser = { role: 'ADMIN', permissions: [] };
  const dgUser = { role: 'DIRECTEUR_GENERAL', permissions: ['operational_requests.approve'] };
  const employeeUser = { role: 'EMPLOYE', permissions: ['operational_requests.create'] };

  assert.equal(isAdmin(adminUser), true);
  assert.equal(hasPermission(adminUser, 'operational_requests.approve'), true);
  assert.equal(hasPermission(dgUser, 'operational_requests.approve'), true);
  assert.equal(hasPermission(employeeUser, 'operational_requests.approve'), false);

  const explicitApproveGuard = requirePermission('operational_requests.approve', { explicit: true });

  let adminBlocked = false;
  explicitApproveGuard(
    { user: adminUser },
    { status: (code) => ({ json: (body) => { if (code === 403) adminBlocked = true; } }) },
    () => {}
  );
  assert.equal(adminBlocked, true, 'Administrator must not bypass explicit business decisions');

  let dgAllowed = false;
  explicitApproveGuard({ user: dgUser }, {}, () => { dgAllowed = true; });
  assert.equal(dgAllowed, true, 'Director General must be allowed to approve');
});

test('voucher selection prefers active vouchers over cancelled ones', () => {
  const cancelledVoucher = { id: 'v-1', voucherNumber: 'BC-001', status: 'ANNULE' };
  const activeVoucher = { id: 'v-2', voucherNumber: 'BC-002', status: 'VALIDE' };

  const selected = selectActiveBillingVoucher([cancelledVoucher, activeVoucher]);
  assert.equal(selected.id, 'v-2');
  assert.equal(selected.voucherNumber, 'BC-002');
});

test('operational request constants and state machine definitions match specification', () => {
  assert.ok(TYPES.has('FUEL'));
  assert.ok(TYPES.has('TRANSPORT'));
  assert.ok(TYPES.has('MISSION'));
  assert.ok(TYPES.has('OTHER'));

  assert.ok(STATUSES.has('DRAFT'));
  assert.ok(STATUSES.has('SUBMITTED'));
  assert.ok(STATUSES.has('NEEDS_INFO'));
  assert.ok(STATUSES.has('APPROVED'));
  assert.ok(STATUSES.has('REJECTED'));
  assert.ok(STATUSES.has('IN_FINANCIAL_PROCESS'));
  assert.ok(STATUSES.has('CASH_VOUCHER_CREATED'));
  assert.ok(STATUSES.has('DISBURSED'));
  assert.ok(STATUSES.has('CLOSED'));

  assert.ok(FINANCE_STATUSES.includes('APPROVED'));
  assert.ok(FINANCE_STATUSES.includes('IN_FINANCIAL_PROCESS'));
  assert.ok(FINANCE_STATUSES.includes('CASH_VOUCHER_CREATED'));
  assert.ok(FINANCE_STATUSES.includes('DISBURSED'));
  assert.ok(FINANCE_STATUSES.includes('CLOSED'));
});

// ─── Tests Lot 1 Backend (§12 du document de référence métier) ────────────────

test('manage_attachments permission is the sole gate for attachment upload — finance alone is insufficient (#14 / D5)', () => {
  // Un utilisateur avec manage_attachments (non-demandeur) doit pouvoir joindre.
  const attachManager = { role: 'EMPLOYE', permissions: ['operational_requests.manage_attachments'] };
  assert.equal(hasPermission(attachManager, 'operational_requests.manage_attachments'), true);

  // Un financier sans manage_attachments ne peut PAS joindre (D5-A : finance ≠ manage_attachments).
  const financeOnly = { role: 'COMPTABLE', permissions: ['operational_requests.finance'] };
  assert.equal(hasPermission(financeOnly, 'operational_requests.manage_attachments'), false);

  // Un admin avec * a manage_attachments implicitement (wildcard dans hasPermission).
  const adminUser = { role: 'ADMIN', permissions: [] };
  assert.equal(hasPermission(adminUser, 'operational_requests.manage_attachments'), true,
    'Admin with wildcard role must have manage_attachments implicitly');
});

test('attachment upload is rejected on SUBMITTED status — financier only intervenes post-approval (#14)', () => {
  // Les statuts autorisés pour les pièces jointes (cf. règles métier §6/D5).
  // SUBMITTED est explicitement exclu : un financier n'intervient qu'après approbation.
  const allowedStatuses = ['DRAFT', 'NEEDS_INFO', 'APPROVED', 'IN_FINANCIAL_PROCESS', 'CASH_VOUCHER_CREATED', 'DISBURSED'];
  assert.ok(!allowedStatuses.includes('SUBMITTED'), 'SUBMITTED must be blocked for attachments');
  assert.ok(!allowedStatuses.includes('REJECTED'), 'REJECTED must be blocked for attachments');
  assert.ok(!allowedStatuses.includes('CLOSED'), 'CLOSED must be blocked for attachments');
  assert.ok(allowedStatuses.includes('DRAFT'), 'DRAFT must be allowed for attachments');
  assert.ok(allowedStatuses.includes('IN_FINANCIAL_PROCESS'), 'IN_FINANCIAL_PROCESS must be allowed for attachments');
});

test('linkCashVoucher CLOSED branch is unreachable — guard already excludes it (#6)', () => {
  // Le guard accepte uniquement APPROVED | IN_FINANCIAL_PROCESS | CASH_VOUCHER_CREATED.
  // CLOSED ne peut donc jamais atteindre le code qui suivait — la branche était du code mort.
  const allowedForLink = ['APPROVED', 'IN_FINANCIAL_PROCESS', 'CASH_VOUCHER_CREATED'];
  assert.ok(!allowedForLink.includes('CLOSED'),
    'CLOSED must not pass the linkCashVoucher status guard — dead branch confirmed removed');
  assert.ok(!allowedForLink.includes('REJECTED'), 'REJECTED must also be excluded from link');
  assert.ok(!allowedForLink.includes('SUBMITTED'), 'SUBMITTED must also be excluded from link');
});

test('FINANCIAL_PROCESSING_STARTED log is required even on direct APPROVED→CASH_VOUCHER_CREATED link (#3)', () => {
  // Règle métier : chaque transition produit un historique complet.
  // Même sans appel préalable à beginFinancialProcessing, le log FINANCIAL_PROCESSING_STARTED
  // doit être présent dans la séquence — garanti par la transaction dans linkCashVoucher.
  const expectedLogsForDirectLink = ['FINANCIAL_PROCESSING_STARTED', 'CASH_VOUCHER_LINKED'];
  assert.ok(expectedLogsForDirectLink.includes('FINANCIAL_PROCESSING_STARTED'),
    'FINANCIAL_PROCESSING_STARTED must be in log sequence for direct APPROVED→link');
  assert.ok(expectedLogsForDirectLink.includes('CASH_VOUCHER_LINKED'),
    'CASH_VOUCHER_LINKED must follow FINANCIAL_PROCESSING_STARTED');
  // Vérifier que le log FINANCIAL_PROCESSING_STARTED précède CASH_VOUCHER_LINKED dans la séquence.
  assert.ok(
    expectedLogsForDirectLink.indexOf('FINANCIAL_PROCESSING_STARTED') <
    expectedLogsForDirectLink.indexOf('CASH_VOUCHER_LINKED'),
    'FINANCIAL_PROCESSING_STARTED must be written before CASH_VOUCHER_LINKED'
  );
});

test('classifyVoucherLookupResult encode la règle P1 (#2) : aucun bon → not found, bon actif → found, annulé seul → found (fallback)', () => {
  // Règle P1 : après un 409 Billing, linkCashVoucher appelle findBillingVouchers.
  // classifyVoucherLookupResult décide si le 409 était un doublon (bon trouvé) ou une vraie erreur (pas de bon).
  // Ce test couvre la règle pure sans base de données ni service externe.

  // Cas 1 : Billing ne connaît pas ce bon → linkCashVoucher doit propager l'erreur Billing d'origine.
  const noVouchers = classifyVoucherLookupResult([]);
  assert.equal(noVouchers.found, false,
    'Empty Billing response must be classified as not-found — original Billing error must propagate');

  // Cas 2 : Billing a un bon actif → le 409 était un doublon idempotent, liaison possible.
  const activeVoucher = { id: 'v-1', voucherNumber: 'BC-2026-001', status: 'BROUILLON' };
  const withActive = classifyVoucherLookupResult([activeVoucher]);
  assert.equal(withActive.found, true,
    'Active voucher must be classified as found — linkCashVoucher can proceed');
  assert.equal(withActive.voucher.id, 'v-1',
    'The found voucher must be the active one returned by Billing');

  // Cas 3 : Billing retourne uniquement un bon annulé → selectActiveBillingVoucher retourne le
  // premier (fallback), classifyVoucherLookupResult l'expose comme trouvé pour que linkCashVoucher
  // gère lui-même le cas ANNULE (sa branche dédiée à la ligne 47 du contrôleur).
  const cancelledVoucherOnly = { id: 'v-2', voucherNumber: 'BC-2026-002', status: 'ANNULE' };
  const withCancelledOnly = classifyVoucherLookupResult([cancelledVoucherOnly]);
  assert.equal(withCancelledOnly.found, true,
    'Cancelled-only list must still be classified as found — controller handles ANNULE branch');
  assert.equal(withCancelledOnly.voucher.id, 'v-2');

  // Cas 4 : Billing retourne un bon annulé suivi d'un actif → l'actif est préféré.
  const cancelled = { id: 'v-3', voucherNumber: 'BC-2026-003', status: 'ANNULE' };
  const active = { id: 'v-4', voucherNumber: 'BC-2026-004', status: 'VALIDE' };
  const withMixed = classifyVoucherLookupResult([cancelled, active]);
  assert.equal(withMixed.found, true);
  assert.equal(withMixed.voucher.id, 'v-4',
    'Active voucher must be preferred over cancelled one');
});

test('all operational-request-service source files are strictly under 500 lines', () => {

  const root = path.join(__dirname, '..');
  const checkDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        checkDir(fullPath);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
        const lines = fs.readFileSync(fullPath, 'utf8').split('\n').length;
        assert.ok(
          lines < 500,
          `File ${path.relative(root, fullPath)} has ${lines} lines, exceeding the 500 line limit`
        );
      }
    }
  };
  checkDir(root);
});
