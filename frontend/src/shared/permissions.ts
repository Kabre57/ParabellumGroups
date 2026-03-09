import { User } from './api/shared/types';

const normalizePermissions = (permissions?: unknown): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions.filter((p) => typeof p === 'string') as string[];
  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => typeof p === 'string') as string[];
      }
    } catch {
      return [];
    }
  }
  return [];
};

export const buildPermissionSet = (user: User | null | undefined): Set<string> => {
  const raw: string[] = [];
  if (Array.isArray(user?.permissionsList)) {
    raw.push(...user.permissionsList);
  }
  raw.push(...normalizePermissions(user?.permissions));
  return new Set(raw.map((p) => p.toLowerCase()));
};

export const getPermissionAliases = (permission: string): string[] => {
  const normalized = permission.toLowerCase();
  const aliases = new Set<string>([normalized]);

  if (normalized.endsWith('.read')) {
    aliases.add(normalized.replace(/\.read$/, '.view'));
    aliases.add(normalized.replace(/\.read$/, '.view_all'));
    aliases.add(normalized.replace(/\.read$/, '.view_assigned'));
    aliases.add(normalized.replace(/\.read$/, '.read_all'));
    aliases.add(normalized.replace(/\.read$/, '.read_assigned'));
  }

  if (normalized.endsWith('.view')) {
    aliases.add(normalized.replace(/\.view$/, '.read'));
  }

  if (normalized.endsWith('.read_all')) {
    aliases.add(normalized.replace(/\.read_all$/, '.read'));
  }

  if (normalized.endsWith('.read_assigned')) {
    aliases.add(normalized.replace(/\.read_assigned$/, '.read'));
  }

  if (normalized === 'messages.read') {
    aliases.add('messages.view');
  }

  if (normalized === 'inventory.read') {
    aliases.add('inventory.view');
    aliases.add('inventory.view_all');
    aliases.add('inventory.view_warehouse');
  }

  return Array.from(aliases);
};

export const isAdminRole = (user: User | null | undefined): boolean => {
  if (!user?.role) return false;

  const role = user.role as any;

  if (typeof role === 'string') {
    const upperRole = role.toUpperCase();
    return upperRole === 'ADMIN' || upperRole === 'ADMINISTRATOR' || upperRole === 'ADMINISTRATEUR';
  }

  if (role && typeof role === 'object') {
    const roleValue =
      role.code || role.name || role.value || role.role || (role.toString && role.toString());

    if (typeof roleValue === 'string') {
      const upperRole = roleValue.toUpperCase();
      return upperRole === 'ADMIN' || upperRole === 'ADMINISTRATOR' || upperRole === 'ADMINISTRATEUR';
    }
  }

  return false;
};

export const hasPermission = (
  user: User | null | undefined,
  permission?: string
): boolean => {
  if (!permission) return true;
  if (isAdminRole(user)) return true;

  const perm = permission.toLowerCase();
  if (perm === 'admin') return false;

  const permissionSet = buildPermissionSet(user);
  const aliases = getPermissionAliases(perm);
  return aliases.some((alias) => permissionSet.has(alias));
};
