import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const isWindows = process.platform === 'win32';
const npmRunner = isWindows ? 'cmd' : 'npm';
const wrapNpmArgs = (args) => (isWindows ? ['/c', 'npm', ...args] : args);

const steps = [
  { label: 'Frontend lint', cwd: 'frontend', command: npmRunner, args: wrapNpmArgs(['run', 'lint']) },
  { label: 'Notification service build', cwd: 'services/notification-service', command: npmRunner, args: wrapNpmArgs(['run', 'build']) },
  { label: 'Auth service tests', cwd: 'services/auth-service', command: npmRunner, args: wrapNpmArgs(['test']) },
  { label: 'API Gateway tests', cwd: 'services/api-gateway', command: npmRunner, args: wrapNpmArgs(['test']) },
  { label: 'Customer service lint', cwd: 'services/customer-service', command: npmRunner, args: wrapNpmArgs(['run', 'lint']) },
  { label: 'Customer service tests', cwd: 'services/customer-service', command: npmRunner, args: wrapNpmArgs(['test']) },
];

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`);
  const result = spawnSync(step.command, step.args, {
    cwd: resolve(repoRoot, step.cwd),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nValidation pipeline completed successfully.');
