'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Shield, Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminUsersService, adminPermissionsService } from '@/shared/api/admin/admin.service';
import { groupPermissionsByService } from './permissionGrouping';

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
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions-modal'],
    queryFn: () => adminPermissionsService.getPermissions(),
    enabled: isOpen,
  });

  const { data: userPermissionsData, isLoading: userPermissionsLoading } = useQuery({
    queryKey: ['admin-user-permissions', user?.id],
    queryFn: () => adminUsersService.getUserPermissions(user.id),
    enabled: isOpen && !!user?.id,
  });

  const permissions = useMemo(() => permissionsData?.data || [], [permissionsData]);
  const userPermissions = useMemo(() => userPermissionsData?.data || [], [userPermissionsData]);

  const filteredPermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return permissions;

    return permissions.filter((perm: any) =>
      perm.name.toLowerCase().includes(query) ||
      (perm.description && perm.description.toLowerCase().includes(query)),
    );
  }, [permissions, searchQuery]);

  const permissionServices = useMemo(
    () => groupPermissionsByService(filteredPermissions),
    [filteredPermissions],
  );

  useEffect(() => {
    const permIds = new Set(
      userPermissions
        .map((up: any) => up.permissionId || up.permission?.id)
        .filter(Boolean),
    );
    setSelectedPermissions(permIds);
  }, [userPermissions]);

  useEffect(() => {
    if (permissionServices.length > 0) {
      setExpandedServices(new Set(permissionServices.map((service) => service.id)));
    }
  }, [permissionServices]);

  const togglePermission = (permissionId: number) => {
    if (!canEdit) return;

    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
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
    if (!canEdit) return;

    const service = permissionServices.find((item) => item.id === serviceId);
    if (!service) return;

    setSelectedPermissions((current) => {
      const next = new Set(current);
      service.permissions.forEach((perm) => next.add(perm.id));
      return next;
    });
  };

  const deselectAllInService = (serviceId: string) => {
    if (!canEdit) return;

    const service = permissionServices.find((item) => item.id === serviceId);
    if (!service) return;

    setSelectedPermissions((current) => {
      const next = new Set(current);
      service.permissions.forEach((perm) => next.delete(perm.id));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canEdit) return;

    try {
      setIsSubmitting(true);
      await adminUsersService.setUserPermissions(user.id, {
        permissionIds: Array.from(selectedPermissions),
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

  const isLoading = permissionsLoading || userPermissionsLoading;

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
                const selectedCount = service.permissions.filter((perm) => selectedPermissions.has(perm.id)).length;
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
                      </button>

                      {canEdit && (
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
                                const isSelected = selectedPermissions.has(permission.id);
                                return (
                                  <label
                                    key={permission.id}
                                    className="flex cursor-pointer items-start rounded p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <div className="flex h-5 items-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => togglePermission(permission.id)}
                                        disabled={!canEdit}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div className="ml-3 min-w-0 flex-1">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {permission.name}
                                      </span>
                                      {permission.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                                      )}
                                    </div>
                                    {isSelected && <Check className="ml-3 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />}
                                  </label>
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
            <span className="font-medium">{selectedPermissions.size}</span> permission(s) selectionnee(s)
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
            {canEdit && (
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
          </div>
        </div>
      </div>
    </div>
  );
};
