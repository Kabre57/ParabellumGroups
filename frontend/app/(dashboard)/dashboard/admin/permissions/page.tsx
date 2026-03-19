'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CreatePermissionModal } from '@/components/permissions/CreatePermissionModal';
import { EditPermissionModal } from '@/components/permissions/EditPermissionModal';
import { adminPermissionsService, adminRolesService, type Permission } from '@/shared/api/admin';
import { groupPermissionsByService } from '@/components/users/permissionGrouping';
import { hasAnyPermission, hasPermission } from '@/shared/permissions';
import { useAuth } from '@/shared/hooks/useAuth';
import { Building2, ChevronDown, ChevronRight, Edit, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function PermissionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  const canCreatePermissions = hasPermission(user, 'permissions.create');
  const canEditPermissions = hasPermission(user, 'permissions.update');
  const canDeletePermissions = hasPermission(user, 'permissions.delete');
  const canReadRoles = hasAnyPermission(user, ['roles.read', 'roles.read_own']);
  const canReadUsers = hasAnyPermission(user, ['users.read', 'users.read_own', 'users.read_all']);

  const { data: permissionsData, isLoading, error } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => adminPermissionsService.getPermissions(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesService.getRoles(),
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (id: number) => adminPermissionsService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      toast.success('Permission supprimée');
    },
    onError: (apiError: any) => {
      toast.error(apiError?.response?.data?.message || apiError?.message || 'Erreur lors de la suppression');
    },
  });

  const permissions = useMemo(() => (Array.isArray(permissionsData?.data) ? permissionsData.data : []), [permissionsData]);
  const roles = useMemo(() => (Array.isArray(rolesData?.data) ? rolesData.data : []), [rolesData]);

  const filteredPermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return permissions.filter((permission: any) => {
      const matchesQuery =
        !query ||
        permission.name?.toLowerCase().includes(query) ||
        permission.description?.toLowerCase().includes(query) ||
        permission.category?.toLowerCase().includes(query);
      return matchesQuery;
    });
  }, [permissions, searchQuery]);

  const permissionModules = useMemo(() => groupPermissionsByService(filteredPermissions), [filteredPermissions]);

  const visibleModules = useMemo(
    () => permissionModules.filter((module) => selectedModule === 'all' || module.id === selectedModule),
    [permissionModules, selectedModule]
  );

  React.useEffect(() => {
    setExpandedModules(new Set(permissionModules.map((module) => module.id)));
  }, [permissionModules]);

  const handleEditPermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowEditModal(true);
  };

  const handleDeletePermission = (permission: Permission) => {
    if (confirm(`Supprimer la permission "${permission.name}" ?`)) {
      deletePermissionMutation.mutate(permission.id);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-800">Erreur lors du chargement des permissions.</p>
        <p className="mt-1 text-sm text-red-600">{(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permissions par module</h1>
          <p className="mt-2 text-muted-foreground">
            Présentation modulaire des permissions, avec un vocabulaire fonctionnel plus clair pour les utilisateurs et plus simple à maintenir pour les développeurs.
          </p>
        </div>
        {canCreatePermissions && (
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle permission
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-blue-500 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Permissions par rôle</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Le plus simple pour l’exploitation: on attribue un ensemble cohérent de droits métier à un rôle.
              </p>
            </div>
            <Shield className="h-5 w-5 text-blue-500" />
          </div>
          {canReadRoles && (
            <Button variant="outline" asChild className="mt-4">
              <Link href="/dashboard/admin/roles-management">Gérer les rôles</Link>
            </Button>
          )}
        </Card>

        <Card className="border-l-4 border-amber-500 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Exceptions utilisateur</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                À utiliser seulement pour les cas particuliers, afin d’éviter que les rôles deviennent incohérents.
              </p>
            </div>
            <Users className="h-5 w-5 text-amber-500" />
          </div>
          {canReadUsers && (
            <Button variant="outline" asChild className="mt-4">
              <Link href="/dashboard/admin/users">Gérer les utilisateurs</Link>
            </Button>
          )}
        </Card>

        <Card className="border-l-4 border-emerald-500 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Lecture métier</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Chaque bloc ci-dessous correspond à un module applicatif avec ses pages associées et ses permissions expliquées en français.
              </p>
            </div>
            <Building2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            {permissionModules.length} module(s) pour {permissions.length} permission(s)
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher une permission, une description ou un sous-module..."
              className="pl-9"
            />
          </div>
          <select
            value={selectedModule}
            onChange={(event) => setSelectedModule(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Tous les modules</option>
            {permissionModules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Permissions</p>
          <p className="mt-2 text-2xl font-bold">{permissions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Modules</p>
          <p className="mt-2 text-2xl font-bold">{permissionModules.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Rôles système</p>
          <p className="mt-2 text-2xl font-bold">{roles.length}</p>
        </Card>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">Chargement des permissions...</Card>
        ) : visibleModules.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Aucun module ne correspond aux filtres actuels.
          </Card>
        ) : (
          visibleModules.map((module) => {
            const isExpanded = expandedModules.has(module.id);
            return (
              <Card key={module.id} className="overflow-hidden">
                <div className="border-b bg-gray-50 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <button type="button" onClick={() => toggleModule(module.id)} className="flex flex-1 items-start text-left">
                      {isExpanded ? (
                        <ChevronDown className="mr-3 mt-0.5 h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="mr-3 mt-0.5 h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold">{module.label}</h2>
                          <Badge variant="outline">{module.permissions.length} permission(s)</Badge>
                        </div>
                        {module.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-5 p-5">
                    {module.dashboards.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Pages principales</div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {module.dashboards.map((dashboard) => (
                            <div key={dashboard.href} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="font-medium text-slate-900">{dashboard.label}</div>
                              <div className="mt-1 text-xs text-slate-500">{dashboard.href}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {module.subgroups.map((subgroup) => (
                      <div key={`${module.id}-${subgroup.id}`} className="space-y-3">
                        <div className="border-b pb-2">
                          <h3 className="font-medium">{subgroup.label}</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px]">
                            <thead>
                              <tr className="border-b text-left text-xs uppercase tracking-wider text-gray-500">
                                <th className="px-3 py-2">Permission</th>
                                <th className="px-3 py-2">Description fonctionnelle</th>
                                <th className="px-3 py-2">Catégorie</th>
                                {(canEditPermissions || canDeletePermissions) && (
                                  <th className="px-3 py-2 text-right">Actions</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {subgroup.permissions.map((permission) => (
                                <tr key={permission.id} className="border-b last:border-b-0">
                                  <td className="px-3 py-3">
                                    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                      {permission.name}
                                    </code>
                                  </td>
                                  <td className="px-3 py-3 text-sm text-gray-600">
                                    {permission.description || 'Description à compléter dans le catalogue des permissions.'}
                                  </td>
                                  <td className="px-3 py-3">
                                    <Badge variant="outline">{permission.category}</Badge>
                                  </td>
                                  {(canEditPermissions || canDeletePermissions) && (
                                    <td className="px-3 py-3">
                                      <div className="flex justify-end gap-2">
                                        {canEditPermissions && (
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleEditPermission(permission)}
                                            className="h-8 w-8"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {canDeletePermissions && (
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDeletePermission(permission)}
                                            className="h-8 w-8 text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {canCreatePermissions && (
        <CreatePermissionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
            setShowCreateModal(false);
          }}
        />
      )}

      {canEditPermissions && (
        <EditPermissionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPermission(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
            setShowEditModal(false);
            setSelectedPermission(null);
          }}
          permission={selectedPermission}
        />
      )}
    </div>
  );
}
