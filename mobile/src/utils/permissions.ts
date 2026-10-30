import type { User } from '@/stores/authStore';

const ADMIN_ROLES = new Set([
  'ADMIN',
  'ADMINISTRATOR',
  'ADMINISTRATEUR',
  'SUPER_ADMIN',
  'SUPERADMIN',
]);

export function isAdminRole(user: User | null | undefined): boolean {
  return Boolean(user?.role && ADMIN_ROLES.has(user.role.trim().toUpperCase()));
}

function aliasesFor(permission: string): string[] {
  const normalized = permission.trim().toLowerCase();
  const aliases = new Set([normalized]);

  if (normalized.endsWith('.read')) {
    for (const suffix of ['view', 'view_all', 'view_assigned', 'read_all', 'read_assigned', 'read_own', 'read_team']) {
      aliases.add(normalized.replace(/\.read$/, `.${suffix}`));
    }
  }
  if (normalized.endsWith('.view')) aliases.add(normalized.replace(/\.view$/, '.read'));
  if (normalized.endsWith('.read_all')) aliases.add(normalized.replace(/\.read_all$/, '.read'));
  if (normalized.endsWith('.read_assigned')) aliases.add(normalized.replace(/\.read_assigned$/, '.read'));
  if (normalized.endsWith('.read_own')) aliases.add(normalized.replace(/\.read_own$/, '.read'));
  if (normalized.endsWith('.read_team')) aliases.add(normalized.replace(/\.read_team$/, '.read'));
  return [...aliases];
}

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (isAdminRole(user)) return true;
  const granted = new Set((user?.permissions ?? []).map((value) => value.trim().toLowerCase()));
  if (granted.has('*')) return true;
  return aliasesFor(permission).some((alias) => granted.has(alias));
}

export function hasExplicitPermission(user: User | null | undefined, permission: string): boolean {
  const normalized = permission.trim().toLowerCase();
  return Boolean(user?.permissions.some((value) => value.trim().toLowerCase() === normalized));
}
