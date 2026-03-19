import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const steps = [
  { label: 'Frontend lint', cwd: 'frontend', command: 'npm', args: ['run', 'lint'] },
  { label: 'Notification service build', cwd: 'services/notification-service', command: 'npm', args: ['run', 'build'] },
  { label: 'Auth service tests', cwd: 'services/auth-service', command: 'npm', args: ['test'] },
  { label: 'API Gateway tests', cwd: 'services/api-gateway', command: 'npm', args: ['test'] },
  { label: 'Customer service lint', cwd: 'services/customer-service', command: 'npm', args: ['run', 'lint'] },
  { label: 'Customer service tests', cwd: 'services/customer-service', command: 'npm', args: ['test'] },
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
