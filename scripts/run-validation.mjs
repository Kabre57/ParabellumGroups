import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const isWindows = process.platform === 'win32';
const packageManager = isWindows ? 'pnpm.cmd' : 'pnpm';

const steps = [
  { label: 'Frontend lint', cwd: 'frontend', command: packageManager, args: ['run', 'lint'] },
  {
    label: 'Backend JavaScript syntax (services without unit-test jobs)',
    cwd: '.',
    command: process.execPath,
    args: [
      'scripts/check-js-syntax.mjs',
      'services/communication-service',
      'services/technical-service',
      'services/commercial-service',
      'services/inventory-service',
      'services/project-service',
      'services/procurement-service',
      'services/analytics-service',
      'services/notification-service',
    ],
  },
  { label: 'Notification service build', cwd: 'services/notification-service', command: packageManager, args: ['run', 'build'] },
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
