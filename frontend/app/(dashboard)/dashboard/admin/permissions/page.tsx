'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { Building2, Edit, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function PermissionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
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

  useEffect(() => {
    if (selectedModule === 'all' && permissionModules.length > 0) {
      setSelectedModule(permissionModules[0].id);
    }
  }, [permissionModules, selectedModule]);

  const selectedModuleData = useMemo(() => {
    if (permissionModules.length === 0) return null;
    return permissionModules.find((module) => module.id === selectedModule) || permissionModules[0];
  }, [permissionModules, selectedModule]);

  const handleEditPermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowEditModal(true);
  };

  const handleDeletePermission = (permission: Permission) => {
    if (confirm(`Supprimer la permission "${permission.name}" ?`)) {
      deletePermissionMutation.mutate(permission.id);
    }
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher une permission, une description ou un sous-module..."
            className="pl-9"
          />
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

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="p-4">
          <div className="text-sm font-semibold text-gray-700">Modules</div>
          <p className="mt-1 text-xs text-muted-foreground">Choisissez un module pour afficher ses permissions.</p>
          <div className="mt-4 space-y-2">
            {permissionModules.map((module) => {
              const isActive = module.id === selectedModuleData?.id;
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setSelectedModule(module.id)}
                  className={`flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition ${
                    isActive ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{module.label}</span>
                    <Badge variant="outline">{module.permissions.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{module.description}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">Chargement des permissions...</Card>
        ) : !selectedModuleData ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Aucun module ne correspond aux filtres actuels.
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedModuleData.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedModuleData.description}</p>
                </div>
                <Badge variant="outline">{selectedModuleData.permissions.length} permission(s)</Badge>
              </div>
            </Card>

            {selectedModuleData.dashboards.length > 0 && (
              <Card className="p-4">
                <p className="text-sm font-semibold text-gray-700">Pages principales</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {selectedModuleData.dashboards.map((dashboard) => (
                    <div key={dashboard.href} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="font-medium text-slate-900">{dashboard.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{dashboard.href}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {selectedModuleData.subgroups.map((subgroup) => (
              <Card key={`${selectedModuleData.id}-${subgroup.id}`} className="p-4">
                <div className="border-b pb-2">
                  <h4 className="font-medium">{subgroup.label}</h4>
                </div>
                <div className="mt-4 space-y-3">
                  {subgroup.permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex flex-col gap-3 rounded-lg border border-dashed px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold">{permission.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {permission.description || 'Description à compléter dans le catalogue des permissions.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{permission.category}</Badge>
                        {canEditPermissions && (
                          <Button variant="outline" size="sm" onClick={() => handleEditPermission(permission)}>
                            <Edit className="mr-1 h-4 w-4" /> Modifier
                          </Button>
                        )}
                        {canDeletePermissions && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePermission(permission)}
                            disabled={deletePermissionMutation.isPending}
                          >
                            <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {selectedModuleData.subgroups.length === 0 && (
              <Card className="p-4 text-sm text-muted-foreground">
                Aucune permission detaillee pour ce module. Ajoutez-en depuis le catalogue.
              </Card>
            )}
          </div>
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
