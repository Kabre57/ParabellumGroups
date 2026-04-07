import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const frontendDir = resolve(repoRoot, 'frontend');
const isWindows = process.platform === 'win32';
const npmRunner = isWindows ? 'cmd' : 'npm';
const wrapNpmArgs = (args) =>
  isWindows ? ['/c', 'npm', ...args] : args;

const run = (label, command, args, cwd) => {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log('Frontend validation: type-check + JavaScript syntax checks.');
console.log('Note: the historical `next lint` command is not compatible with the current Next.js toolchain in this repository.');

run('TypeScript type-check', npmRunner, wrapNpmArgs(['run', 'type-check']), frontendDir);
run('JavaScript syntax checks', process.execPath, [resolve(scriptDir, 'check-js-syntax.mjs'), frontendDir], repoRoot);
