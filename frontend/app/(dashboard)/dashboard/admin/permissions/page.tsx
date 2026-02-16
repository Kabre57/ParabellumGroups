'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Search, Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { adminPermissionsService, adminRolesService, type Permission } from '@/shared/api/admin';
import { CreatePermissionModal } from '@/components/permissions/CreatePermissionModal';
import { EditPermissionModal } from '@/components/permissions/EditPermissionModal';

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  const queryClient = useQueryClient();

  const { data: permissionsData, isLoading: permissionsLoading, error } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => adminPermissionsService.getPermissions(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesService.getRoles(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-permission-categories'],
    queryFn: () => adminPermissionsService.getPermissionCategories(),
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (id: number) => adminPermissionsService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-permission-categories'] });
      toast.success('Permission supprimee');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erreur lors de la suppression');
    }
  });

  const handleDeletePermission = (permission: any) => {
    if (confirm(`Supprimer la permission "${permission.name}" ?`)) {
      deletePermissionMutation.mutate(permission.id);
    }
  };

  const handleEditPermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowEditModal(true);
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-permission-categories'] });
    setShowCreateModal(false);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-permission-categories'] });
    setShowEditModal(false);
    setSelectedPermission(null);
  };

  const permissions = Array.isArray(permissionsData?.data) ? permissionsData.data : [];
  const roles = Array.isArray(rolesData?.data) ? rolesData.data : [];
  const apiCategories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
  
  const categories = ['all', ...new Set([...apiCategories, ...permissions.map((p: any) => p.category)])];

  const filteredPermissions = permissions.filter((permission: any) => {
    const matchesSearch = permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         permission.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         permission.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erreur lors du chargement des permissions</p>
        <p className="text-sm text-red-600 mt-1">{(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Permissions</h1>
          <p className="text-muted-foreground mt-2">
            Configuration des droits d'acces et permissions systeme
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)} 
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle Permission
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-l-4 border-blue-500">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Permissions par rôle</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Définissez les accès standards d'un rôle. Chaque utilisateur hérite
                automatiquement des permissions de son rôle.
              </p>
            </div>
            <Shield className="h-6 w-6 text-blue-500" />
          </div>
          <div className="mt-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/roles-management">Gérer par rôle</Link>
            </Button>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-amber-500">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Permissions utilisateur</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des exceptions individuelles (surcouches) pour un utilisateur
                précis sans changer son rôle global.
              </p>
            </div>
            <Users className="h-6 w-6 text-amber-500" />
          </div>
          <div className="mt-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/users">Gérer par utilisateur</Link>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Permissions</p>
              <p className="text-2xl font-bold">{permissions.length}</p>
            </div>
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold">{categories.length - 1}</p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Roles Systeme</p>
              <p className="text-2xl font-bold">{roles.length}</p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une permission..."
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-md bg-white text-sm"
          >
            <option value="all">Toutes les categories</option>
            {categories.filter(c => c !== 'all').map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {permissionsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Chargement...</p>
          </div>
        ) : filteredPermissions.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune permission</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'Aucune permission ne correspond a votre recherche' : 'Aucune permission configuree'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b text-gray-500">
                  <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider">Permission</th>
                  <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider">Code</th>
                  <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider">Categorie</th>
                  <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider">Description</th>
                  <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider">Roles Autorises</th>
                  <th className="text-center py-4 px-6 font-semibold text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPermissions.map((permission: any) => (
                  <tr key={permission.id} className="border-b hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-sm">{permission.name}</td>
                    <td className="py-4 px-6">
                      <code className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{permission.code || '-'}</code>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-100">
                        {permission.category}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 max-w-xs truncate">
                      {permission.description || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {permission.rolePermissions?.length > 0 ? (
                          permission.rolePermissions.map((rp: any) => (
                            <Badge key={rp.id} variant="secondary" className="text-[10px] bg-green-50 text-green-700">
                              {rp.role?.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">Aucun</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditPermission(permission)}
                          className="h-8 w-8 text-blue-600 border-blue-100 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeletePermission(permission)}
                          className="h-8 w-8 text-red-600 border-red-100 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreatePermissionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditPermissionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPermission(null);
        }}
        onSuccess={handleEditSuccess}
        permission={selectedPermission}
      />
    </div>
  );
}
