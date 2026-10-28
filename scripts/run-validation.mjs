import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const isWindows = process.platform === 'win32';
const packageManager = isWindows ? 'pnpm.cmd' : 'pnpm';

const steps = [
  { label: 'Frontend type-check and JavaScript syntax', cwd: 'frontend', command: packageManager, args: ['run', 'lint'] },
  {
    label: 'Backend JavaScript syntax (all services)',
    cwd: '.',
    command: process.execPath,
    args: ['scripts/check-js-syntax.mjs', 'services'],
  },
  { label: 'Notification service build', cwd: 'services/notification-service', command: packageManager, args: ['run', 'build'] },
  {
    label: 'Technical service tests',
    cwd: 'services/technical-service',
    command: process.execPath,
    args: ['../../scripts/run-node-tests.mjs', 'tests'],
  },
  {
    label: 'Commercial service tests',
    cwd: 'services/commercial-service',
    command: process.execPath,
    args: ['../../scripts/run-node-tests.mjs', 'tests'],
  },
  {
    label: 'Procurement service tests',
    cwd: 'services/procurement-service',
    command: process.execPath,
    args: ['../../scripts/run-node-tests.mjs', 'tests'],
  },
  { label: 'Auth service tests', cwd: 'services/auth-service', command: packageManager, args: ['test'] },
  {
    label: 'API Gateway tests (pnpm)',
    cwd: 'services/api-gateway',
    command: packageManager,
    args: ['test'],
  },
  { label: 'Billing service tests', cwd: 'services/billing-service', command: packageManager, args: ['test'] },
  { label: 'Customer service lint', cwd: 'services/customer-service', command: packageManager, args: ['run', 'lint'] },
  { label: 'Customer service tests', cwd: 'services/customer-service', command: packageManager, args: ['test'] },
  {
    label: 'Operational request service tests',
    cwd: 'services/operational-request-service',
    command: process.execPath,
    args: ['../../scripts/run-node-tests.mjs', 'tests'],
  },
];

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`);
  const usesWindowsCommandScript = isWindows && step.command === packageManager;
  const command = usesWindowsCommandScript ? process.env.ComSpec || 'cmd.exe' : step.command;
  const args = usesWindowsCommandScript
    ? ['/d', '/s', '/c', `call ${[step.command, ...step.args].join(' ')}`]
    : step.args;
  const result = spawnSync(command, args, {
    cwd: resolve(repoRoot, step.cwd),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nValidation pipeline completed successfully.');
