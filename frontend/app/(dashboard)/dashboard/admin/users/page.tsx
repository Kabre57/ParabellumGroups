'use client';

import { useMemo, useState } from 'react';
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
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { PermissionsModal } from '@/components/users/PermissionsModal';
import { useAuth } from '@/shared/hooks/useAuth';
import { adminUsersService, adminRolesService, type AdminUser } from '@/shared/api/admin';
import { hasAnyPermission, hasPermission } from '@/shared/permissions';
import { roleColors, useUsersManagementPageData } from './page.hooks';

export default function UsersManagementPage() {  const { currentUser, activeTab, setActiveTab, page, setPage, limit, search, setSearch, roleFilter, setRoleFilter, showCreateModal, setShowCreateModal, showEditModal, setShowEditModal, showPermissionsModal, setShowPermissionsModal, selectedUser, setSelectedUser, selectedPermissionsUser, setSelectedPermissionsUser, queryClient, canReadUsers, canCreateUsers, canUpdateUsers, canDeleteUsers, canManagePermissionOverrides, canManageUserActions, userTableColumnCount, visibleTabs, normalizedActiveTab, rolesData, roles, usersData, isLoading, error, selectedUserPermissionsData, selectedUserPermissionsLoading, deleteUserMutation, activateMutation, deactivateMutation, handleDeleteUser, handleToggleStatus, handleEditUser, handleCreateSuccess, handleEditSuccess, handlePermissionsSuccess, formatDate, users, pagination, selectedUserPermissions, permissionsByCategory } = useUsersManagementPageData();



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
        <div className="flex items-center gap-2">
          {canReadUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
                normalizedActiveTab === 'users'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Utilisateurs
            </button>
          )}
          {canManagePermissionOverrides && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
                normalizedActiveTab === 'permissions'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Permissions utilisateur
            </button>
          )}
          {canCreateUsers && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Utilisateur
            </button>
          )}
        </div>
      </div>

      {normalizedActiveTab === 'users' && canReadUsers && (
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
      )}

      {normalizedActiveTab === 'permissions' && canManagePermissionOverrides && (
        <div className="bg-white shadow rounded-lg p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Permissions utilisateur</h2>
              <p className="text-sm text-gray-500">
                Resume des permissions individuelles (overrides) attribuees par utilisateur.
              </p>
            </div>
            <UserCheck className="h-6 w-6 text-purple-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Utilisateur</label>
              <select
                value={selectedPermissionsUser?.id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const user = users.find((u) => u.id === id) || null;
                  setSelectedPermissionsUser(user);
                }}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              >
                <option value="">Selectionner un utilisateur</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              {canManagePermissionOverrides && (
                <button
                  onClick={() => {
                    if (!selectedPermissionsUser) return;
                    setSelectedUser(selectedPermissionsUser);
                    setShowPermissionsModal(true);
                  }}
                  disabled={!selectedPermissionsUser}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-purple-600 rounded-md text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Modifier les overrides
                </button>
              )}
            </div>
          </div>

          {!selectedPermissionsUser ? (
            <div className="text-sm text-gray-500">
              Choisissez un utilisateur pour afficher ses permissions individuelles.
            </div>
          ) : selectedUserPermissionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              Chargement des permissions utilisateur...
            </div>
          ) : selectedUserPermissions.length === 0 ? (
            <div className="text-sm text-gray-500">
              Aucun override defini pour cet utilisateur.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedUserPermissions.length}</span> permission(s) utilisateur
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                      {category}
                    </div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {perms.map((perm: any) => (
                        <li key={perm.id || perm.permissionId}>
                          {perm.permission?.name || perm.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {normalizedActiveTab === 'users' && canReadUsers && (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entreprise</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Derniere connexion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              {canManageUserActions && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[160px]">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={userTableColumnCount} className="px-6 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Chargement...</p>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={userTableColumnCount} className="px-6 py-12 text-center">
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
                    {user.enterprise?.name || '-'}
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
                  {canManageUserActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[160px]">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdateUsers && (
                          <button
                            onClick={() => handleEditUser(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-200 text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {canUpdateUsers && (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
                              user.isActive
                                ? 'border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-900'
                                : 'border-green-200 text-green-600 hover:bg-green-50 hover:text-green-900'
                            }`}
                            title={user.isActive ? "Desactiver" : "Activer"}
                          >
                            {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                        )}
                        {canManagePermissionOverrides && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPermissionsModal(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-purple-200 text-purple-600 transition hover:bg-purple-50 hover:text-purple-900"
                            title="Permissions"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        )}
                        {canDeleteUsers && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

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
      )}

      {canCreateUsers && (
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {canUpdateUsers && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={selectedUser}
          onSuccess={handleEditSuccess}
        />
      )}

      {canManagePermissionOverrides && (
        <PermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          user={selectedUser}
          onSuccess={handlePermissionsSuccess}
          canEdit={canManagePermissionOverrides}
        />
      )}
    </div>
  );
}
