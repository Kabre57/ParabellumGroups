const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve('frontend/app/(dashboard)/dashboard/achats/devis/[id]/page.tsx');
const hookPath = path.resolve('frontend/app/(dashboard)/dashboard/achats/devis/[id]/use-purchase-quote-detail.ts');
const helpersPath = path.resolve('frontend/app/(dashboard)/dashboard/achats/devis/[id]/purchase-quote-detail.utils.ts');
const expectedHelpers = [
  'statusLabels',
  'getStatusVariant',
  'formatCurrency',
  'formatDate',
  'parseEnterpriseId',
  'normalizeTimeline',
  'buildProformaComparison',
  'buildCommissionDecisionRows',
];

test('la page d’achat délègue ses calculs métier à un module dédié', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  const hook = fs.readFileSync(hookPath, 'utf8');
  const helpers = fs.readFileSync(helpersPath, 'utf8');
  const exportedHelpers = [...helpers.matchAll(/^export const (\w+)\b/gm)].map((match) => match[1]);

  assert.match(page, /export default function PurchaseQuoteDetailPage/);
  assert.match(page, /usePurchaseQuoteDetailPage/);
  assert.doesNotMatch(page, /procurementService|useMutation|useQuery\(/);
  assert.match(page, /from ['"]\.\/purchase-quote-detail\.utils['"]/);
  assert.doesNotMatch(page, /^const (?:normalizeTimeline|buildProformaComparison|buildCommissionDecisionRows)\b/gm);
  assert.deepEqual(exportedHelpers.sort(), [...expectedHelpers].sort());
  assert.ok(page.split(/\r?\n/).length - 1 < 500, 'la page doit rester centrée sur le rendu');
  assert.ok(hook.split(/\r?\n/).length - 1 < 500, 'le hook doit rester sous 500 lignes');
  assert.ok(helpers.split(/\r?\n/).length - 1 < 500, 'le module de calcul doit rester sous 500 lignes');
  assert.ok(hook.startsWith('/**'), 'le hook doit expliquer son rôle en français');
  assert.ok(helpers.startsWith('/**'), 'le module doit expliquer son rôle en français');
});
