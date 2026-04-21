import { readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('Usage: node scripts/run-node-tests.mjs <file-or-directory> [...]');
  process.exit(1);
}

const TEST_FILE_NAMES = ['.test.js', '.test.cjs', '.test.mjs'];
const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'coverage']);
const files = [];

const isTestFile = (filePath) =>
  TEST_FILE_NAMES.some((suffix) => filePath.endsWith(suffix));

const walk = (targetPath) => {
  const stats = statSync(targetPath);

  if (stats.isDirectory()) {
    for (const entry of readdirSync(targetPath)) {
      if (IGNORED_DIRS.has(entry)) continue;
      walk(join(targetPath, entry));
    }
    return;
  }

  if (isTestFile(targetPath)) {
    files.push(targetPath);
  }
};

for (const target of targets) {
  walk(resolve(target));
}

files.sort((left, right) => left.localeCompare(right));

if (files.length === 0) {
  console.error(`No test files found in: ${targets.join(', ')}`);
  process.exit(1);
}

for (const file of files) {
  await import(pathToFileURL(file).href);
}
