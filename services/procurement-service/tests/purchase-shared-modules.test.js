const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerDirectory = path.join(__dirname, '../controllers/demandeAchat');
const sharedDirectory = path.join(controllerDirectory, 'shared');
const facadePath = path.join(controllerDirectory, 'shared.js');
const expectedExports = [
  'applyEnterpriseScope',
  'assertQuoteAccess',
  'buildActorContext',
  'buildCommitteeEvaluation',
  'buildQuoteWhere',
  'calculateTotals',
  'canApproveQuotes',
  'canCreateRequests',
  'canEvaluateCommittee',
  'canManageProformas',
  'canReadOwnQuotesOnly',
  'canRejectQuotes',
  'canSubmitQuotes',
  'canUpdateRequests',
  'clampCommitteeScore',
  'enqueueProcurementEvent',
  'ensureProformaExists',
  'ensureQuoteExists',
  'generateBonCommandeNumber',
  'generateDemandeAchatNumber',
  'generateProformaNumber',
  'getCorrelationId',
  'normalizeOptionalText',
  'normalizeProformaLines',
  'normalizeQuoteLines',
  'parseNullableNonNegativeInt',
  'prisma',
  'proformaApprovedPayload',
  'proformaCreatedPayload',
  'proformaInclude',
  'proformaRejectedPayload',
  'proformaSubmittedPayload',
  'purchaseOrderCreatedPayload',
  'purchaseQuoteApprovedPayload',
  'purchaseQuoteCreatedPayload',
  'purchaseQuoteRejectedPayload',
  'purchaseQuoteSubmittedPayload',
  'quoteInclude',
  'resolveEnterpriseContext',
  'serializeOrder',
  'serializeProforma',
  'serializeQuote',
  'toDateOrNull',
  'validateProformaReadiness',
  'validateRequestForSubmission',
  'withEnterpriseContext',
];

test('la facade des outils achats conserve ses exports publics', () => {
  const facade = fs.readFileSync(facadePath, 'utf8');
  const block = facade.match(/module\.exports\s*=\s*\{([\s\S]*?)\};/)?.[1] || '';
  const exports = [...block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((match) => match[1]);

  assert.deepEqual(exports.sort(), [...expectedExports].sort());
});

test('les modules partages des achats restent tous sous 500 lignes', () => {
  for (const entry of fs.readdirSync(sharedDirectory)) {
    if (!entry.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(sharedDirectory, entry), 'utf8');
    assert.ok(source.split(/\r?\n/).length - 1 < 500, `${entry} doit rester sous 500 lignes`);
  }
});
