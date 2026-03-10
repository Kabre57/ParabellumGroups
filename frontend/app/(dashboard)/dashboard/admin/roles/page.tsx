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

type PermissionFlags = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
};

const defaultFlags = (): PermissionFlags => ({
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
});

const fields: Array<keyof PermissionFlags> = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'];
const fieldLabels: Record<keyof PermissionFlags, string> = {
  canView: 'Voir',
  canCreate: 'Creer',
  canEdit: 'Modifier',
  canDelete: 'Supprimer',
  canApprove: 'Approuver',
};

const hasAnyFlag = (flags: PermissionFlags): boolean => fields.some((field) => flags[field]);

const normalizeRolePermissions = (rolePermissions: RolePermission[]): Record<number, PermissionFlags> => {
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

export default function RolesPermissionsPage() {
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
    () => groupPermissionsByService(filteredPermissions),
    [filteredPermissions],
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

  const isLoading = permissionsLoading || rolePermissionsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Roles et Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">Configurez les permissions des roles par service metier</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedRoleId && canManagePermissions && (
            <button
              type="button"
              onClick={() => saveRolePermissionsMutation.mutate()}
              disabled={saveRolePermissionsMutation.isPending || isLoading}
              className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveRolePermissionsMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          )}
          {canCreateRoles && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Role
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <label className="mb-3 block text-sm font-medium text-gray-700">Selectionner un role</label>
        {rolesLoading ? (
          <div className="py-4 text-center">Chargement des roles...</div>
        ) : roles.length === 0 ? (
          <div className="py-4 text-center text-gray-500">Aucun role trouve</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {roles.map((role) => (
              <div key={role.id} className="relative">
                <button
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                    selectedRoleId === role.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Shield className={`h-5 w-5 ${selectedRoleId === role.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <span className="block font-medium text-gray-900">{role.name}</span>
                        <span className="text-xs text-gray-500">{role.code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {role.isSystem && <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">Systeme</span>}
                      {!role.isActive && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Inactif</span>}
                    </div>
                  </div>
                </button>
                {!role.isSystem && canDeleteRoles && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRole(role);
                    }}
                    className="absolute right-2 top-2 p-1 text-gray-400 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRoleId && (
        <>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une permission ou un sous-module..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Chargement...</p>
              </div>
            ) : permissionServices.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune permission</h3>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                {permissionServices.map((service) => {
                  const activeCount = service.permissions.filter((permission) =>
                    hasAnyFlag(permissionStates[permission.id] || defaultFlags()),
                  ).length;
                  const isExpanded = expandedServices.has(service.id);

                  return (
                    <div key={service.id} className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className="flex flex-1 items-center text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="mr-2 h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="mr-2 h-5 w-5 text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900">{service.label}</span>
                          <span className="ml-2 text-sm text-gray-500">({activeCount}/{service.permissions.length})</span>
                        </button>

                        {canManagePermissions && (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setAllFlagsForService(service.id, true)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Tout selectionner
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => setAllFlagsForService(service.id, false)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Tout deselectionner
                            </button>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="space-y-5 p-4">
                          {service.dashboards.length > 0 && (
                            <div className="space-y-2">
                              <div className="border-b border-gray-100 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                Dashboards associes
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {service.dashboards.map((dashboard) => (
                                  <span
                                    key={dashboard.href}
                                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                  >
                                    {dashboard.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {service.subgroups.map((subgroup) => (
                            <div key={subgroup.id} className="space-y-3">
                              <div className="border-b border-gray-100 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                {subgroup.label}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full">
                                  <thead>
                                    <tr className="text-left text-xs font-medium uppercase text-gray-500">
                                      <th className="pb-3 pr-4">Permission</th>
                                      {fields.map((field) => (
                                        <th key={field} className="w-24 pb-3 px-2 text-center">{fieldLabels[field]}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {subgroup.permissions.map((permission) => {
                                      const state = permissionStates[permission.id] || defaultFlags();
                                      return (
                                        <tr key={permission.id} className="text-sm">
                                          <td className="py-3 pr-4 align-top">
                                            <div className="flex flex-col">
                                              <span className="font-medium text-gray-900">{permission.name}</span>
                                              {permission.description && (
                                                <span className="text-xs text-gray-500">{permission.description}</span>
                                              )}
                                            </div>
                                          </td>
                                          {fields.map((field) => {
                                            const value = state[field];
                                            return (
                                              <td key={field} className="px-2 py-3 text-center">
                                                <button
                                                  type="button"
                                                  disabled={!canManagePermissions}
                                                  onClick={() => updatePermissionField(permission.id, field, !value)}
                                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                                                    value
                                                      ? 'border-green-200 bg-green-100 text-green-700'
                                                      : 'border-gray-200 bg-gray-100 text-gray-400'
                                                  } ${!canManagePermissions ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-300'}`}
                                                >
                                                  {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                </button>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex">
              <Shield className="mr-3 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Role actuel : {selectedRole?.name}</h4>
                <p className="mt-1 text-sm text-blue-700">
                  Les permissions sont maintenant organisees par service et conservent la granularite voir/creer/modifier/supprimer/approuver.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {canCreateRoles && (
        <CreateRoleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
