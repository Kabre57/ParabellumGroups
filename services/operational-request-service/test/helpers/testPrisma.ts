import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prismaInternals from '@prisma/internals';
import type { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';

const require = createRequire(import.meta.url);
const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const databaseUrl = 'file::memory:';
type ClientConstructor = new (options: { adapter: PrismaBetterSQLite3 }) => PrismaClient;
let clientConstructor: Promise<ClientConstructor> | undefined;

async function prepareClient(): Promise<ClientConstructor> {
  const source = await readFile(join(serviceRoot, 'prisma/schema.prisma'), 'utf8');
  const generator = require.resolve('@prisma/client-test/generator-build');
  // Prisma 5.14 cannot represent the production JSON/enums on SQLite. Keep 6.19
  // confined to this generated test client; the production client stays on 5.14.
  const schema = source
    .replace(/generator client\s*\{[^}]+\}/, [
      'generator client {',
      '  provider = "integration-prisma-client"',
      '  output = "./client"',
      '  engineType = "client"',
      '}',
    ].join('\n'))
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace('env("DATABASE_URL")', JSON.stringify(databaseUrl))
    .replace(/@db\.Decimal\(\d+,\s*\d+\)/g, '');
  const digest = createHash('sha256').update(schema).update('6.19.0').digest('hex').slice(0, 16);
  const directory = join(serviceRoot, 'node_modules/.cache/integration-prisma', digest);
  const schemaPath = join(directory, 'schema.prisma');
  const clientPath = join(directory, 'client/index.js');
  await mkdir(directory, { recursive: true });
  try {
    await access(clientPath);
  } catch {
    await writeFile(schemaPath, schema);
    // A registered generator avoids installing a second `prisma` CLI binary,
    // which would otherwise shadow production's Prisma 5 command in pnpm.
    const generators = await prismaInternals.getGenerators({
      schemaPath,
      registry: {
        'integration-prisma-client': { type: 'rpc', generatorPath: generator, isNode: true },
      },
    });
    try {
      for (const item of generators) await item.generate();
    } finally {
      for (const item of generators) item.stop();
    }
  }
  const generated: { PrismaClient: ClientConstructor } = require(clientPath);
  return generated.PrismaClient;
}

/** Translate only the PostgreSQL syntax used by the committed migrations.
 * Tables, defaults, indexes and constraints still come from those migrations.
 * Unknown statements fail instead of silently creating an incomplete database.
 */
function sqliteStatements(migration: string): string[] {
  const enumNames = [...migration.matchAll(/CREATE TYPE "([^"]+)" AS ENUM \([^;]+\);/g)]
    .map((match) => match[1]);
  let sql = migration.replace(/CREATE TYPE "[^"]+" AS ENUM \([^;]+\);/g, '');
  for (const name of enumNames) sql = sql.replaceAll(`"${name}"`, 'TEXT');
  sql = sql.replace(/TIMESTAMP\(3\)/g, 'DATETIME');
  const foreignKeys: { table: string; constraint: string }[] = [];
  sql = sql.replace(
    /ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (FOREIGN KEY[^;]+);/g,
    (_statement, table: string, name: string, constraint: string) => {
      foreignKeys.push({ table, constraint: `CONSTRAINT "${name}" ${constraint}` });
      return '';
    },
  );
  for (const { table, constraint } of foreignKeys) {
    const opening = `CREATE TABLE "${table}" (`;
    const start = sql.indexOf(opening);
    const end = sql.indexOf('\n);', start);
    if (start < 0 || end < 0) throw new Error(`SQLite migration: missing table ${table}.`);
    sql = `${sql.slice(0, end)},\n  ${constraint}${sql.slice(end)}`;
  }
  // Current migrations contain no semicolons inside literals or procedural SQL.
  return sql.split(';').map((statement) => statement.trim()).filter(Boolean).map((statement) => {
    if (!/^CREATE (?:TABLE|(?:UNIQUE )?INDEX)\b/.test(statement)) {
      throw new Error(`Unsupported SQLite migration statement: ${statement.slice(0, 120)}`);
    }
    return statement;
  });
}

async function applyMigrations(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  await prisma.$executeRawUnsafe(`CREATE TABLE "_test_migrations" (
    "name" TEXT PRIMARY KEY, "checksum" TEXT NOT NULL
  )`);
  const migrationsRoot = join(serviceRoot, 'prisma/migrations');
  const migrations = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (!migrations.length) throw new Error('No operational-request migrations found.');
  for (const name of migrations) {
    const sql = await readFile(join(migrationsRoot, name, 'migration.sql'), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    await prisma.$transaction(async (tx) => {
      for (const statement of sqliteStatements(sql)) await tx.$executeRawUnsafe(statement);
      await tx.$executeRawUnsafe('INSERT INTO "_test_migrations" ("name", "checksum") VALUES (?, ?)', name, checksum);
    });
  }
}

/** A fresh, genuinely in-memory database per call, never DATABASE_URL. */
export async function createTestPrisma(): Promise<PrismaClient> {
  clientConstructor ??= prepareClient();
  const TestPrismaClient = await clientConstructor;
  const prisma = new TestPrismaClient({ adapter: new PrismaBetterSQLite3({ url: databaseUrl }) });
  try {
    await prisma.$connect();
    const databases = await prisma.$queryRawUnsafe<{ name: string; file: string }[]>('PRAGMA database_list');
    if (databases.find((database) => database.name === 'main')?.file !== '') {
      throw new Error('Integration tests must use an in-memory SQLite database.');
    }
    await applyMigrations(prisma);
    return prisma;
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
