const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const bcrypt = require('bcryptjs');

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error('DATABASE_URL is required for auth fallback bootstrap');
}

const toPsqlDatabaseUrl = (value) => {
  const url = new URL(value);
  url.searchParams.delete('schema');
  return url.toString();
};

const databaseUrl = toPsqlDatabaseUrl(rawDatabaseUrl);

const runPsql = (args) =>
  execFileSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const sqlLiteral = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const scalar = (sql) => runPsql(['-t', '-A', '-c', sql]);

const tableCount = Number(
  scalar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';") || 0
);

if (tableCount === 0) {
  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  const migrations = readdirSync(migrationsDir)
    .filter((entry) => entry !== 'migration_lock.toml')
    .map((entry) => join(migrationsDir, entry, 'migration.sql'))
    .filter((file) => existsSync(file))
    .sort();

  for (const migration of migrations) {
    console.log(`[auth-fallback] Applying ${migration}`);
    runPsql(['-q', '-f', migration]);
  }
} else {
  console.log(`[auth-fallback] Database already contains ${tableCount} tables; migrations skipped.`);
}

const email = process.env.ADMIN_EMAIL || 'admin@parabellum.com';
const password = process.env.ADMIN_PASSWORD || 'Admin@2026!';
const passwordHash = bcrypt.hashSync(password, 10);

runPsql([
  '-q',
  '-c',
  `
  WITH admin_role AS (
    INSERT INTO roles (name, code, description, is_system, is_active, created_at, updated_at)
    VALUES ('Administrateur', 'ADMIN', 'Acces complet au systeme', TRUE, TRUE, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system = TRUE,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING id
  )
  INSERT INTO users (
    email, password_hash, first_name, last_name, role_id, is_active, created_at, updated_at
  )
  SELECT
    ${sqlLiteral(email)},
    ${sqlLiteral(passwordHash)},
    'Admin',
    'Parabellum',
    id,
    TRUE,
    NOW(),
    NOW()
  FROM admin_role
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = COALESCE(users.first_name, EXCLUDED.first_name),
    last_name = COALESCE(users.last_name, EXCLUDED.last_name),
    role_id = COALESCE(users.role_id, EXCLUDED.role_id),
    is_active = TRUE,
    updated_at = NOW();
  `,
]);

console.log(`[auth-fallback] Admin ready: ${email}`);
