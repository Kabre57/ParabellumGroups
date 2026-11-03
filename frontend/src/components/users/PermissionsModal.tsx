'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Shield, Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminUsersService, adminPermissionsService, type UserPermission } from '@/shared/api/admin/admin.service';
import { groupPermissionsByService } from './permissionGrouping';
import { useAuth } from '@/shared/hooks/useAuth';
import { isServiceManager as isServiceManagerRole } from '@/shared/permissions';

type PermissionFlags = Pick<UserPermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canApprove'>;

const emptyPermissionFlags = (): PermissionFlags => ({
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
});

const readPermissionFlags = (permission?: any): PermissionFlags => ({
  canView: Boolean(permission?.canView),
  canCreate: Boolean(permission?.canCreate),
  canEdit: Boolean(permission?.canEdit),
  canDelete: Boolean(permission?.canDelete),
  canApprove: Boolean(permission?.canApprove),
});

const permissionFlagLabels: Array<{ key: keyof PermissionFlags; label: string }> = [
  { key: 'canView', label: 'Voir' },
  { key: 'canCreate', label: 'Créer' },
  { key: 'canEdit', label: 'Modifier' },
  { key: 'canDelete', label: 'Supprimer' },
  { key: 'canApprove', label: 'Valider' },
];

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess?: () => void;
  canEdit?: boolean;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
  canEdit = true,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [delegatedFlags, setDelegatedFlags] = useState<Record<number, PermissionFlags>>({});
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();
  const isDelegationMode = isServiceManagerRole(currentUser);
  const targetRoleCode = String(user?.role?.code || user?.roleCode || user?.role || '').toUpperCase();
  const isAdministratorTarget = ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPER_ADMIN', 'SUPERADMIN', 'GENERAL_DIRECTOR', 'GERANT', 'SERVICE_MANAGER'].includes(targetRoleCode);
  const canModifyTarget = canEdit && !isAdministratorTarget;

  const hasPermissionFlags = (permission: any) =>
    Boolean(
      permission?.canView ||
      permission?.canCreate ||
      permission?.canEdit ||
      permission?.canDelete ||
      permission?.canApprove
    );

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions-modal'],
    queryFn: () => adminPermissionsService.getPermissions(),
    enabled: isOpen && !isDelegationMode,
  });

  const { data: permissionModulesData, isLoading: permissionModulesLoading } = useQuery({
    queryKey: ['admin-permission-modules'],
    queryFn: () => adminPermissionsService.getPermissionModules(),
    enabled: isOpen && !isDelegationMode,
  });

  const { data: delegablePermissionsData, isLoading: delegablePermissionsLoading } = useQuery({
    queryKey: ['admin-delegable-permissions'],
    queryFn: () => adminUsersService.getDelegablePermissions(),
    enabled: isOpen && isDelegationMode,
  });

  const { data: userPermissionsData, isLoading: userPermissionsLoading } = useQuery({
    queryKey: ['admin-user-permissions', user?.id],
    queryFn: () => adminUsersService.getUserPermissions(user.id),
    enabled: isOpen && !!user?.id,
  });

  const permissions = useMemo(
    () => (isDelegationMode ? delegablePermissionsData?.data || [] : permissionsData?.data || []),
    [delegablePermissionsData, isDelegationMode, permissionsData],
  );
  const permissionModules = useMemo(() => permissionModulesData?.data || [], [permissionModulesData]);
  const userPermissions = useMemo(() => userPermissionsData?.data || [], [userPermissionsData]);
  const userPermissionsById = useMemo(() => {
    const map = new Map<number, any>();
    userPermissions.forEach((permission: any) => {
      const permissionId = Number(permission.permissionId || permission.permission?.id);
      if (Number.isFinite(permissionId)) {
        map.set(permissionId, permission);
      }
    });
    return map;
  }, [userPermissions]);

  const effectivePermissions = useMemo(
    () =>
      permissions.map((permission: any) => ({
        ...permission,
        source: userPermissionsById.get(permission.id)?.source || null,
      })),
    [permissions, userPermissionsById]
  );

  const currentExceptionCount = useMemo(
    () =>
      userPermissions.filter((permission: any) => {
        const source = permission?.source;
        return source === 'user' || source === 'mixed' || source === 'revoked';
      }).length,
    [userPermissions]
  );

  const filteredPermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return effectivePermissions;

    return effectivePermissions.filter((perm: any) =>
      perm.name.toLowerCase().includes(query) ||
      (perm.description && perm.description.toLowerCase().includes(query)),
    );
  }, [effectivePermissions, searchQuery]);

  const permissionServices = useMemo(
    () => groupPermissionsByService(filteredPermissions, permissionModules),
    [filteredPermissions, permissionModules],
  );

  useEffect(() => {
    if (isDelegationMode) {
      const next: Record<number, PermissionFlags> = {};
      permissions.forEach((permission: any) => {
        const current = userPermissionsById.get(permission.id);
        next[permission.id] = readPermissionFlags(current);
      });
      setDelegatedFlags(next);
      return;
    }

    const permIds = new Set(
      userPermissions
        .filter(hasPermissionFlags)
        .map((up: any) => up.permissionId || up.permission?.id)
        .filter(Boolean),
    );
    setSelectedPermissions(permIds);
  }, [isDelegationMode, permissions, userPermissions, userPermissionsById]);

  useEffect(() => {
    if (permissionServices.length > 0) {
      setExpandedServices(new Set(permissionServices.map((service) => service.id)));
    }
  }, [permissionServices]);

  const togglePermission = (permissionId: number) => {
    if (!canModifyTarget || isDelegationMode) return;

    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const toggleDelegatedFlag = (permissionId: number, flag: keyof PermissionFlags, enabled: boolean) => {
    if (!canModifyTarget || !isDelegationMode) return;
    setDelegatedFlags((current) => ({
      ...current,
      [permissionId]: {
        ...(current[permissionId] || emptyPermissionFlags()),
        [flag]: enabled,
      },
    }));
  };

  const toggleService = (serviceId: string) => {
    setExpandedServices((current) => {
      const next = new Set(current);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const selectAllInService = (serviceId: string) => {
    if (!canModifyTarget || isDelegationMode) return;

    const service = permissionServices.find((item) => item.id === serviceId);
    if (!service) return;

    setSelectedPermissions((current) => {
      const next = new Set(current);
      service.permissions.forEach((perm) => next.add(perm.id));
      return next;
    });
  };

  const deselectAllInService = (serviceId: string) => {
    if (!canModifyTarget || isDelegationMode) return;

    const service = permissionServices.find((item) => item.id === serviceId);
    if (!service) return;

    setSelectedPermissions((current) => {
      const next = new Set(current);
      service.permissions.forEach((perm) => next.delete(perm.id));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canModifyTarget) return;

    try {
      setIsSubmitting(true);
      if (isDelegationMode) {
        const changedPermissions = permissions
          .filter((permission: any) => {
            const before = readPermissionFlags(userPermissionsById.get(permission.id));
            const after = delegatedFlags[permission.id] || emptyPermissionFlags();
            return permissionFlagLabels.some(({ key }) => before[key] !== after[key]);
          })
          .map((permission: any) => ({
            permissionId: permission.id,
            ...(delegatedFlags[permission.id] || emptyPermissionFlags()),
          }));

        if (!changedPermissions.length) {
          toast.info('Aucun changement à enregistrer.');
          return;
        }
        await adminUsersService.setUserPermissions(user.id, { permissions: changedPermissions });
        toast.success('Accès du membre mis à jour avec succès');
        onSuccess?.();
        onClose();
        return;
      }

      await adminUsersService.setUserPermissions(user.id, {
        permissions: permissions.map((permission: any) => {
          const isSelected = selectedPermissions.has(permission.id);
          return {
            permissionId: permission.id,
            canView: isSelected,
            canCreate: isSelected,
            canEdit: isSelected,
            canDelete: isSelected,
            canApprove: isSelected,
          };
        }),
      });

      toast.success('Permissions mises a jour avec succes');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur mise a jour permissions:', error);
      toast.error(error?.message || 'Erreur lors de la mise a jour des permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = permissionsLoading || permissionModulesLoading || delegablePermissionsLoading || userPermissionsLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h3 className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
              <Shield className="mr-2 h-5 w-5 text-purple-600" />
              Gerer les Permissions
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {user?.firstName} {user?.lastName} - {user?.role?.name || user?.role}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une permission ou un sous-module..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            {isDelegationMode ? (
              <>Vous pouvez transmettre uniquement les droits que vous possédez. Les accès d’administration et les droits supérieurs aux vôtres sont bloqués.</>
            ) : (
              <>Les permissions <strong>héritées du rôle</strong> peuvent être cochées ou retirées via une exception utilisateur. Le rôle <strong>Administrateur</strong> reste protégé et ne peut pas être surchargé ici.</>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-500">Chargement des permissions...</span>
            </div>
          ) : permissionServices.length === 0 ? (
            <div className="py-8 text-center text-gray-500">Aucune permission trouvee</div>
          ) : (
            <div className="space-y-4">
              {permissionServices.map((service) => {
                const selectedCount = service.permissions.filter((perm) => isDelegationMode
                  ? hasPermissionFlags(delegatedFlags[perm.id])
                  : selectedPermissions.has(perm.id)).length;
                const inheritedCount = service.permissions.filter((perm: any) => (perm as any).source === 'role').length;
                const exceptionCount = service.permissions.filter((perm: any) => {
                  const source = (perm as any).source;
                  return source === 'user' || source === 'mixed';
                }).length;
                const isExpanded = expandedServices.has(service.id);

                return (
                  <div key={service.id} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 dark:bg-gray-700">
                      <button type="button" onClick={() => toggleService(service.id)} className="flex flex-1 items-center text-left">
                        {isExpanded ? (
                          <ChevronDown className="mr-2 h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="mr-2 h-5 w-5 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{service.label}</span>
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          ({selectedCount}/{service.permissions.length})
                        </span>
                        <span className="ml-3 text-xs text-slate-500 dark:text-slate-400">
                          {inheritedCount} héritée(s) · {exceptionCount} exception(s)
                        </span>
                      </button>

                      {canModifyTarget && !isDelegationMode && (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => selectAllInService(service.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Tout selectionner
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button
                            type="button"
                            onClick={() => deselectAllInService(service.id)}
                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
                            <div className="border-b border-gray-100 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                              Dashboards associes
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              {service.dashboards.map((dashboard) => (
                                <div
                                  key={dashboard.href}
                                  className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-xs dark:border-blue-900/40 dark:bg-blue-900/20"
                                >
                                  <div className="font-semibold text-blue-800 dark:text-blue-200">
                                    {dashboard.label}
                                  </div>
                                  <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-200/80">
                                    {dashboard.href}
                                  </div>
                                  {dashboard.permissions && dashboard.permissions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {dashboard.permissions.map((permission) => (
                                        <span
                                          key={`${dashboard.href}-${permission}`}
                                          className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                          {permission}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {service.subgroups.map((subgroup) => (
                          <div key={subgroup.id} className="space-y-2">
                            <div className="border-b border-gray-100 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                              {subgroup.label}
                            </div>
                            <div className="space-y-2">
                              {subgroup.permissions.map((permission) => {
                                const isSelected = isDelegationMode
                                  ? hasPermissionFlags(delegatedFlags[permission.id])
                                  : selectedPermissions.has(permission.id);
                                const currentFlags = delegatedFlags[permission.id] || emptyPermissionFlags();
                                const maximumFlags = readPermissionFlags(permission);
                                const source = (permission as any).source;
                                const isInheritedOnly = source === 'role';
                                const isDirectException = source === 'user' || source === 'mixed';
                                const isRevoked = source === 'revoked';
                                const sourceLabel =
                                  source === 'role'
                                    ? 'Hérité du rôle'
                                    : source === 'mixed'
                                      ? 'Rôle + surcharge'
                                      : source === 'user'
                                        ? 'Surcharge utilisateur'
                                        : source === 'revoked'
                                          ? 'Retirée par exception'
                                        : null;
                                return (
                                  <div
                                    key={permission.id}
                                    className={`flex items-start rounded p-2 transition-colors ${
                                      !canModifyTarget
                                        ? 'bg-slate-50/80 dark:bg-slate-800/30'
                                        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    {isDelegationMode ? (
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                                        {permissionFlagLabels.map(({ key, label }) => (
                                          <label key={key} className={`inline-flex items-center gap-1 text-[11px] ${maximumFlags[key] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                            <input
                                              type="checkbox"
                                              checked={currentFlags[key]}
                                              onChange={(event) => toggleDelegatedFlag(permission.id, key, event.target.checked)}
                                              disabled={!canModifyTarget || !maximumFlags[key]}
                                              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            {label}
                                          </label>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex h-5 items-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => togglePermission(permission.id)}
                                          disabled={!canModifyTarget}
                                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                      </div>
                                    )}
                                    <div className="ml-3 min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {permission.name}
                                        </span>
                                        {sourceLabel && (
                                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                            {sourceLabel}
                                          </span>
                                        )}
                                      </div>
                                      {permission.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                                      )}
                                      {!isDelegationMode && isInheritedOnly && (
                                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                          Cette permission vient du rôle. Décoche-la pour créer une exception de retrait.
                                        </p>
                                      )}
                                      {!isDelegationMode && !source && (
                                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                          Non accordée actuellement. Coche-la pour créer une exception utilisateur.
                                        </p>
                                      )}
                                      {!isDelegationMode && isDirectException && (
                                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                          Cette permission est portée par une exception utilisateur explicite.
                                        </p>
                                      )}
                                      {!isDelegationMode && isRevoked && (
                                        <p className="mt-1 text-[11px] text-red-500 dark:text-red-300">
                                          Cette permission vient du rôle mais elle est retirée pour cet utilisateur.
                                        </p>
                                      )}
                                    </div>
                                    {isSelected && <Check className="ml-3 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />}
                                  </div>
                                );
                              })}
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

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {isDelegationMode ? (
              <><span className="font-medium">{Object.values(delegatedFlags).filter(hasPermissionFlags).length}</span> accès avec au moins un droit activé</>
            ) : (
              <><span className="font-medium">{selectedPermissions.size}</span> permission(s) effectives · <span className="font-medium">{currentExceptionCount}</span> exception(s) utilisateur</>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            {canModifyTarget && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Enregistrer les permissions
                  </>
                )}
              </button>
            )}
            {canEdit && isAdministratorTarget && (
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Administrateur protégé
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
