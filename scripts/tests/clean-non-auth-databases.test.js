const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.join(__dirname, '..', 'clean-non-auth-databases.sh');
const script = fs.readFileSync(scriptPath, 'utf8');
const resetScriptPath = path.join(__dirname, '..', 'reset-non-auth-data.sh');
const resetScript = fs.readFileSync(resetScriptPath, 'utf8');

test('database cleanup script protects the auth database by default', () => {
  assert.match(script, /load_env_value DB_USER/);
  assert.match(script, /load_env_value POSTGRES_USER/);
  assert.match(script, /sql_literal/);
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

test('reset script delegates to safe cleanup and keeps auth-service out of restarts', () => {
  assert.match(resetScript, /clean-non-auth-databases\.sh/);
  assert.match(resetScript, /auth-service/);
  assert.match(resetScript, /docker compose restart/);
  assert.match(resetScript, /--no-restart/);
});

test('reset script keeps destructive extras explicit', () => {
  assert.match(resetScript, /--flush-redis/);
  assert.match(resetScript, /REDIS_PASSWORD est requis/);
  assert.doesNotMatch(resetScript, /docker compose down -v/);
});
