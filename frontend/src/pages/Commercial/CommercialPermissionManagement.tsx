import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Target, TrendingUp, BarChart3, Save, X, Check, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const userService = createCrudService('users');

const commercialPermissionCategories = {
  prospects: {
    label: 'Prospects',
    icon: Target,
    color: 'bg-blue-100 text-blue-800',
    permissions: [
      { key: 'prospects.create', label: 'Créer des prospects' },
      { key: 'prospects.read', label: 'Consulter les prospects' },
      { key: 'prospects.update', label: 'Modifier les prospects' },
      { key: 'prospects.delete', label: 'Supprimer des prospects' },
      { key: 'prospects.export', label: 'Exporter des prospects' }
    ]
  },
  dashboard: {
    label: 'Tableau de bord',
    icon: TrendingUp,
    color: 'bg-green-100 text-green-800',
    permissions: [
      { key: 'commercial.dashboard', label: 'Accéder au tableau de bord commercial' },
      { key: 'commercial.reports', label: 'Consulter les rapports commerciaux' }
    ]
  },
  pipeline: {
    label: 'Pipeline',
    icon: BarChart3,
    color: 'bg-purple-100 text-purple-800',
    permissions: [
      { key: 'commercial.pipeline', label: 'Gérer le pipeline commercial' },
      { key: 'commercial.analytics', label: 'Analytique commerciale' }
    ]
  }
};

export const CommercialPermissionManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => userService.getAll({ search, limit: 100 })
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: number; permissions: string[] }) =>
      fetch(`/api/v1/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ permissions })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditing(false);
      toast.success('Permissions commerciales mises à jour avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  });

  const handleUserSelect = async (user: any) => {
    setSelectedUser(user);
    setIsEditing(false);
    
    // Récupérer les permissions actuelles de l'utilisateur
    try {
      const response = await fetch(`/api/v1/users/${user.id}/permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUserPermissions(data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      setUserPermissions([]);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setUserPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    try {
      await updatePermissionsMutation.mutateAsync({
        userId: selectedUser.id,
        permissions: userPermissions
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const usersList = users?.data?.users || [];

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Permissions Commerciales</h1>
          <p className="text-gray-600">Attribuez des permissions spécifiques au module commercial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des utilisateurs */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Utilisateurs</h3>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {usersList.map((user: any) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      <div className="text-xs text-blue-600">
                        {user.service?.name || 'Aucun service'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration des permissions */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Permissions Commerciales de {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedUser.service?.name || 'Aucun service'} • {selectedUser.email}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Modifier les permissions</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSavePermissions}
                          disabled={updatePermissionsMutation.isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          <span>Sauvegarder</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            handleUserSelect(selectedUser);
                          }}
                          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <X className="h-4 w-4" />
                          <span>Annuler</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  {Object.entries(commercialPermissionCategories).map(([categoryKey, category]) => {
                    const Icon = category.icon;
                    return (
                      <div key={categoryKey} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <Icon className="h-5 w-5 text-gray-400 mr-2" />
                            <h4 className="text-lg font-medium text-gray-900">{category.label}</h4>
                            <span className={`ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${category.color}`}>
                              {category.permissions.length} permissions
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {category.permissions.map((permission) => (
                            <div key={permission.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-3 ${
                                  userPermissions.includes(permission.key) 
                                    ? 'bg-green-500' 
                                    : 'bg-gray-300'
                                }`}></div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {permission.label}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {permission.key}
                                  </div>
                                </div>
                              </div>
                              {isEditing && (
                                <button
                                  onClick={() => handlePermissionToggle(permission.key)}
                                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                    userPermissions.includes(permission.key)
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-gray-300 hover:border-blue-500'
                                  }`}
                                >
                                  {userPermissions.includes(permission.key) && (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sélectionnez un utilisateur
              </h3>
              <p className="text-gray-500">
                Choisissez un utilisateur dans la liste pour configurer ses permissions commerciales
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};