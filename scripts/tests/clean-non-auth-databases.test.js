const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.join(__dirname, '..', 'clean-non-auth-databases.sh');
const script = fs.readFileSync(scriptPath, 'utf8');

test('database cleanup script protects the auth database by default', () => {
  assert.match(script, /AUTH_DATABASE="\$\{AUTH_DATABASE:-parabellum_auth\}"/);
  assert.match(script, /Protection active: refus de nettoyer la base auth/);
  assert.match(script, /\[\[ "\$database" == "\$AUTH_DATABASE" \]\]/);
});

test('database cleanup script preserves Prisma migration history', () => {
  assert.match(script, /tablename <> '_prisma_migrations'/);
  assert.doesNotMatch(script, /TRUNCATE TABLE .*_prisma_migrations/);
});

test('database cleanup script truncates data without dropping databases or schemas', () => {
  assert.match(script, /TRUNCATE TABLE %I\.%I RESTART IDENTITY CASCADE/);
  assert.doesNotMatch(script, /\bDROP\s+DATABASE\b/i);
  assert.doesNotMatch(script, /\bDROP\s+SCHEMA\b/i);
});

test('database cleanup script requires explicit confirmation unless --yes is used', () => {
  assert.match(script, /--yes/);
  assert.match(script, /Tape NETTOYER/);
  assert.match(script, /\[\[ "\$confirmation" != "NETTOYER" \]\]/);
});

test('database cleanup script supports a safe dry-run mode', () => {
  assert.match(script, /--dry-run/);
  assert.match(script, /Mode dry-run: aucune table ne sera videe/);
  assert.match(script, /count\(\*\) FROM pg_tables/);
});
