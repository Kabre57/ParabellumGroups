#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sidebarPath = path.join(repoRoot, 'frontend/src/components/layout/sidebarData.ts');
const authSeedPath = path.join(repoRoot, 'services/auth-service/prisma/seed-complete-permissions.js');

const extractPermissions = (fileContent) =>
  [...fileContent.matchAll(/permission:\s*'([^']+)'/g)].map((match) => match[1]);

const extractAuthPermissions = (fileContent) =>
  [...fileContent.matchAll(/\{\s*name:\s*'([^']+)'/g)].map((match) => match[1]);

const sidebarPermissions = [...new Set(extractPermissions(fs.readFileSync(sidebarPath, 'utf8')))].sort();
const authPermissions = new Set(extractAuthPermissions(fs.readFileSync(authSeedPath, 'utf8')));
const reservedPermissions = new Set(['admin']);

const unknownPermissions = sidebarPermissions.filter(
  (permission) => !reservedPermissions.has(permission) && !authPermissions.has(permission)
);

if (unknownPermissions.length > 0) {
  console.error('Unknown sidebar permissions:');
  unknownPermissions.forEach((permission) => console.error(`- ${permission}`));
  process.exitCode = 1;
} else {
  console.log('Sidebar permissions are aligned with auth seed.');
}
