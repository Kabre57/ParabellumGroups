'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Shield,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { PermissionsModal } from '@/components/users/PermissionsModal';
import { adminUsersService, adminRolesService, type AdminUser } from '@/shared/api/admin';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  GENERAL_DIRECTOR: 'bg-purple-100 text-purple-800',
  SERVICE_MANAGER: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-gray-100 text-gray-800',
  ACCOUNTANT: 'bg-green-100 text-green-800',
  COMMERCIAL: 'bg-orange-100 text-orange-800',
  PURCHASING_MANAGER: 'bg-yellow-100 text-yellow-800',
  TECHNICIAN: 'bg-indigo-100 text-indigo-800'
};

export default function UsersManagementPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const queryClient = useQueryClient();

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesService.getRoles(),
  });

  const roles = Array.isArray(rolesData?.data) ? rolesData.data : [];

  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, limit, search, roleFilter],
    queryFn: () => adminUsersService.getUsers({
      page,
      limit,
      search: search || undefined,
      roleId: roleFilter ? parseInt(roleFilter) : undefined,
    }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => adminUsersService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Utilisateur supprime avec succes');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression');
    }
  });

  const activateMutation = useMutation({
    mutationFn: (userId: number) => adminUsersService.activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Utilisateur active');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur');
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => adminUsersService.deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Utilisateur desactive');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur');
    }
  });

  const handleDeleteUser = (user: AdminUser) => {
    if (confirm(`Supprimer "${user.firstName} ${user.lastName}" ?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleToggleStatus = (user: AdminUser) => {
    if (user.isActive) {
      deactivateMutation.mutate(user.id);
    } else {
      activateMutation.mutate(user.id);
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setShowCreateModal(false);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setShowEditModal(false);
  };

  const handlePermissionsSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setShowPermissionsModal(false);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const users = Array.isArray(usersData?.data) ? usersData.data : [];
  const pagination = usersData?.pagination;

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erreur lors du chargement des utilisateurs</p>
        <p className="text-sm text-red-600 mt-1">{(error as any)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerez les comptes utilisateurs, roles et permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Utilisateur
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            >
              <option value="">Tous les roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Derniere connexion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Chargement...</p>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur</h3>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      roleColors[user.role?.code || ''] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role?.name || 'Non defini'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.service?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className={user.isActive ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"}
                        title={user.isActive ? "Desactiver" : "Activer"}
                      >
                        {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPermissionsModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                        title="Permissions"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {page} sur {pagination.totalPages} ({pagination.total} resultats)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditUserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        onSuccess={handleEditSuccess}
      />

      <PermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        user={selectedUser}
        onSuccess={handlePermissionsSuccess}
      />
    </div>
  );
}
