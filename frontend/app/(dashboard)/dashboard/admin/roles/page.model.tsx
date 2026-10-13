'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  adminRolesService,
  adminPermissionsService,
  type Role,
  type Permission,
  type RolePermission,
} from '@/shared/api/admin';
import { CreateRoleModal } from '@/components/roles/CreateRoleModal';
import { hasPermission } from '@/shared/permissions';
import { groupPermissionsByService } from '@/components/users/permissionGrouping';

// État, chargement et actions du parcours d'interface.


export type PermissionFlags = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
};



export const defaultFlags = (): PermissionFlags => ({
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
});



export const fields: Array<keyof PermissionFlags> = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'];


export const fieldLabels: Record<keyof PermissionFlags, string> = {
  canView: 'Voir',
  canCreate: 'Creer',
  canEdit: 'Modifier',
  canDelete: 'Supprimer',
  canApprove: 'Approuver',
};



export const hasAnyFlag = (flags: PermissionFlags): boolean => fields.some((field) => flags[field]);



export const normalizeRolePermissions = (rolePermissions: RolePermission[]): Record<number, PermissionFlags> => {
  const next: Record<number, PermissionFlags> = {};

  rolePermissions.forEach((rolePermission) => {
    next[rolePermission.permissionId] = {
      canView: rolePermission.canView,
      canCreate: rolePermission.canCreate,
      canEdit: rolePermission.canEdit,
      canDelete: rolePermission.canDelete,
      canApprove: rolePermission.canApprove,
    };
  });

  return next;
};

export function useRolesPermissionsPageModel() {

  const { user } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [permissionStates, setPermissionStates] = useState<Record<number, PermissionFlags>>({});

  const queryClient = useQueryClient();
  const canCreateRoles = hasPermission(user, 'roles.create');
  const canDeleteRoles = hasPermission(user, 'roles.delete');
  const canManagePermissions = hasPermission(user, 'roles.manage_permissions') || hasPermission(user, 'permissions.manage');

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesService.getRoles(true),
  });

  const roles = Array.isArray(rolesData?.data) ? rolesData.data : [];

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => adminPermissionsService.getPermissions(),
  });

  const allPermissions = Array.isArray(permissionsData?.data) ? permissionsData.data : [];

  const { data: permissionModulesData, isLoading: permissionModulesLoading } = useQuery({
    queryKey: ['admin-permission-modules'],
    queryFn: () => adminPermissionsService.getPermissionModules(),
  });

  const permissionModules = Array.isArray(permissionModulesData?.data) ? permissionModulesData.data : [];

  const { data: rolePermissionsData, isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ['admin-role-permissions', selectedRoleId],
    queryFn: () => adminRolesService.getRolePermissions(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  const rolePermissions = Array.isArray(rolePermissionsData?.data) ? rolePermissionsData.data : [];
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allPermissions;

    return allPermissions.filter((permission: Permission) =>
      permission.name.toLowerCase().includes(query) ||
      permission.description?.toLowerCase().includes(query),
    );
  }, [allPermissions, search]);

  const permissionServices = useMemo(
    () => groupPermissionsByService(filteredPermissions, permissionModules),
    [filteredPermissions, permissionModules],
  );

  useEffect(() => {
    setPermissionStates(normalizeRolePermissions(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    if (permissionServices.length > 0) {
      setExpandedServices(new Set(permissionServices.map((service) => service.id)));
    }
  }, [permissionServices]);

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: number) => adminRolesService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setSelectedRoleId(null);
      toast.success('Role supprime');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression');
    },
  });

  const saveRolePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;

      const initial = normalizeRolePermissions(rolePermissions);
      const permissionIds = new Set<number>([
        ...Object.keys(initial).map(Number),
        ...Object.keys(permissionStates).map(Number),
      ]);

      for (const permissionId of permissionIds) {
        const current = permissionStates[permissionId] || defaultFlags();
        const previous = initial[permissionId] || defaultFlags();
        const changed = fields.some((field) => current[field] !== previous[field]);

        if (!changed) continue;

        if (!hasAnyFlag(current)) {
          if (hasAnyFlag(previous)) {
            await adminRolesService.deleteRolePermission(selectedRoleId, permissionId);
          }
          continue;
        }

        await adminRolesService.updateRolePermission(selectedRoleId, permissionId, current);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-role-permissions', selectedRoleId] });
      toast.success('Permissions du role mises a jour');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise a jour des permissions du role');
    },
  });

  const toggleService = (serviceId: string) => {
    setExpandedServices((current) => {
      const next = new Set(current);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const updatePermissionField = (permissionId: number, field: keyof PermissionFlags, value: boolean) => {
    if (!canManagePermissions) return;

    setPermissionStates((current) => ({
      ...current,
      [permissionId]: {
        ...(current[permissionId] || defaultFlags()),
        [field]: value,
      },
    }));
  };

  const setAllFlagsForService = (serviceId: string, value: boolean) => {
    if (!canManagePermissions) return;

    const service = permissionServices.find((item) => item.id === serviceId);
    if (!service) return;

    setPermissionStates((current) => {
      const next = { ...current };
      service.permissions.forEach((permission) => {
        next[permission.id] = {
          canView: value,
          canCreate: value,
          canEdit: value,
          canDelete: value,
          canApprove: value,
        };
      });
      return next;
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) {
      toast.error('Impossible de supprimer un role systeme');
      return;
    }

    if (confirm(`Supprimer le role "${role.name}" ?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const isLoading = permissionsLoading || permissionModulesLoading || rolePermissionsLoading;
  return {
    user,
    selectedRoleId,
    setSelectedRoleId,
    search,
    setSearch,
    expandedServices,
    setExpandedServices,
    showCreateModal,
    setShowCreateModal,
    permissionStates,
    setPermissionStates,
    queryClient,
    canCreateRoles,
    canDeleteRoles,
    canManagePermissions,
    rolesData,
    rolesLoading,
    roles,
    permissionsData,
    permissionsLoading,
    allPermissions,
    permissionModulesData,
    permissionModulesLoading,
    permissionModules,
    rolePermissionsData,
    rolePermissionsLoading,
    rolePermissions,
    selectedRole,
    filteredPermissions,
    permissionServices,
    deleteRoleMutation,
    saveRolePermissionsMutation,
    toggleService,
    updatePermissionField,
    setAllFlagsForService,
    handleDeleteRole,
    isLoading,
  };
}
