import { User } from './api/shared/types';
import { hasAnyPermission, hasPermission } from './permissions';

interface CrudVisibilityConfig {
  read: string[];
  create?: string[];
  update?: string[];
  remove?: string[];
  approve?: string[];
  export?: string[];
  extras?: Record<string, string[]>;
}

export const getCrudVisibility = (user: User | null | undefined, config: CrudVisibilityConfig) => {
  const result: Record<string, boolean> = {
    canRead: hasAnyPermission(user, config.read),
    canCreate: (config.create || []).some((permission) => hasPermission(user, permission)),
    canUpdate: (config.update || []).some((permission) => hasPermission(user, permission)),
    canDelete: (config.remove || []).some((permission) => hasPermission(user, permission)),
    canApprove: (config.approve || []).some((permission) => hasPermission(user, permission)),
    canExport: (config.export || []).some((permission) => hasPermission(user, permission)),
  };

  Object.entries(config.extras || {}).forEach(([key, permissions]) => {
    result[key] = permissions.some((permission) => hasPermission(user, permission));
  });

  return result;
};
