'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminPermissionsService, adminRolesService, type Permission } from '@/shared/api/admin';

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPermission, setNewPermission] = useState({ name: '', description: '', category: '' });
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', category: '' });

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

  const createPermissionMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; category: string }) => 
      adminPermissionsService.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      toast.success('Permission creee avec succes');
      setShowCreateForm(false);
      setNewPermission({ name: '', description: '', category: '' });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la creation');
    }
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (id: number) => adminPermissionsService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      toast.success('Permission supprimee');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression');
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; category?: string } }) =>
      adminPermissionsService.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      toast.success('Permission mise a jour');
      setEditingPermission(null);
      setEditForm({ name: '', description: '', category: '' });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise a jour');
    }
  });

  const handleCreatePermission = () => {
    if (!newPermission.name || !newPermission.category) {
      toast.error('Nom et categorie requis');
      return;
    }
    createPermissionMutation.mutate(newPermission);
  };

  const handleDeletePermission = (permission: Permission) => {
    if (confirm(`Supprimer la permission "${permission.name}" ?`)) {
      deletePermissionMutation.mutate(permission.id);
    }
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setEditForm({
      name: permission.name,
      description: permission.description || '',
      category: permission.category
    });
  };

  const handleUpdatePermission = () => {
    if (!editingPermission) return;
    if (!editForm.name || !editForm.category) {
      toast.error('Nom et categorie requis');
      return;
    }
    updatePermissionMutation.mutate({
      id: editingPermission.id,
      data: editForm
    });
  };

  const handleCancelEdit = () => {
    setEditingPermission(null);
    setEditForm({ name: '', description: '', category: '' });
  };

  const permissions = permissionsData?.data || [];
  const roles = rolesData?.data || [];
  const apiCategories = categoriesData?.data || [];
  
  const categories = ['all', ...new Set([...apiCategories, ...permissions.map(p => p.category)])];

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         permission.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = filteredPermissions.reduce((acc, perm) => {
    const cat = perm.category || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

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
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Permission
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Creer une nouvelle permission</h3>
          {editingPermission && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <h3 className="font-semibold mb-4">Modifier la permission: {editingPermission.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Nom de la permission"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Input
              placeholder="Categorie"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            />
            <Input
              placeholder="Description (optionnel)"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpdatePermission} disabled={updatePermissionMutation.isPending}>
              {updatePermissionMutation.isPending ? 'Mise a jour...' : 'Mettre a jour'}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>Annuler</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Nom de la permission"
              value={newPermission.name}
              onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
            />
            <Input
              placeholder="Categorie"
              value={newPermission.category}
              onChange={(e) => setNewPermission({ ...newPermission, category: e.target.value })}
            />
            <Input
              placeholder="Description (optionnel)"
              value={newPermission.description}
              onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleCreatePermission} disabled={createPermissionMutation.isPending}>
              {createPermissionMutation.isPending ? 'Creation...' : 'Creer'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      {editingPermission && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <h3 className="font-semibold mb-4">Modifier la permission: {editingPermission.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Nom de la permission"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Input
              placeholder="Categorie"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            />
            <Input
              placeholder="Description (optionnel)"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpdatePermission} disabled={updatePermissionMutation.isPending}>
              {updatePermissionMutation.isPending ? 'Mise a jour...' : 'Mettre a jour'}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>Annuler</Button>
          </div>
        </Card>
      )}

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
            className="px-4 py-2 border rounded-md"
          >
            <option value="all">Toutes les categories</option>
            {categories.filter(c => c !== 'all').map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="p-6">
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
          <div className="space-y-6">
            {Object.entries(groupedByCategory).map(([category, perms]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-purple-500" />
                  {category}
                  <Badge className="ml-2 bg-gray-100 text-gray-800">{perms.length}</Badge>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-semibold text-sm">Permission</th>
                        <th className="text-left py-2 px-4 font-semibold text-sm">Description</th>
                        <th className="text-left py-2 px-4 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((permission) => (
                        <tr key={permission.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{permission.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {permission.description || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditPermission(permission)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePermission(permission)}
                                className="text-red-600 hover:text-red-900"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
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
    </div>
  );
}
