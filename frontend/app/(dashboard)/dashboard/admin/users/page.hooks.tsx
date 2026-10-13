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

// Logique d'interface et chargement des comptes utilisateurs.


export const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  GENERAL_DIRECTOR: 'bg-purple-100 text-purple-800',
  GERANT: 'bg-cyan-100 text-cyan-800',
  SERVICE_MANAGER: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-gray-100 text-gray-800',
  ACCOUNTANT: 'bg-green-100 text-green-800',
  COMMERCIAL: 'bg-orange-100 text-orange-800',
  PURCHASING_MANAGER: 'bg-yellow-100 text-yellow-800',
  TECHNICIAN: 'bg-indigo-100 text-indigo-800'
};

export function useUsersManagementPageData() {

  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPermissionsUser, setSelectedPermissionsUser] = useState<AdminUser | null>(null);

  const queryClient = useQueryClient();
  const canReadUsers = hasAnyPermission(currentUser, ['users.read', 'users.read_own', 'users.read_all']);
  const canCreateUsers = hasPermission(currentUser, 'users.create');
  const canUpdateUsers = hasPermission(currentUser, 'users.update');
  const canDeleteUsers = hasPermission(currentUser, 'users.delete');
  const canManagePermissionOverrides = hasAnyPermission(currentUser, ['permissions.manage', 'users.update']);
  const canManageUserActions = canUpdateUsers || canDeleteUsers || canManagePermissionOverrides;
  const userTableColumnCount = canManageUserActions ? 7 : 6;
  const visibleTabs = useMemo(
    () =>
      [
        canReadUsers ? 'users' : null,
        canManagePermissionOverrides ? 'permissions' : null,
      ].filter(Boolean) as Array<'users' | 'permissions'>,
    [canManagePermissionOverrides, canReadUsers]
  );

  const normalizedActiveTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0] || 'users';

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

  const { data: selectedUserPermissionsData, isLoading: selectedUserPermissionsLoading } = useQuery({
    queryKey: ['admin-user-permissions-summary', selectedPermissionsUser?.id],
    queryFn: () => adminUsersService.getUserPermissions(selectedPermissionsUser!.id),
    enabled: activeTab === 'permissions' && !!selectedPermissionsUser?.id,
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
  const selectedUserPermissions = Array.isArray(selectedUserPermissionsData?.data)
    ? selectedUserPermissionsData.data
    : [];

  const permissionsByCategory = selectedUserPermissions.reduce((acc: Record<string, any[]>, perm: any) => {
    const category = perm.permission?.category || perm.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});
  return {
    currentUser,
    activeTab,
    setActiveTab,
    page,
    setPage,
    limit,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    showPermissionsModal,
    setShowPermissionsModal,
    selectedUser,
    setSelectedUser,
    selectedPermissionsUser,
    setSelectedPermissionsUser,
    queryClient,
    canReadUsers,
    canCreateUsers,
    canUpdateUsers,
    canDeleteUsers,
    canManagePermissionOverrides,
    canManageUserActions,
    userTableColumnCount,
    visibleTabs,
    normalizedActiveTab,
    rolesData,
    roles,
    usersData,
    isLoading,
    error,
    selectedUserPermissionsData,
    selectedUserPermissionsLoading,
    deleteUserMutation,
    activateMutation,
    deactivateMutation,
    handleDeleteUser,
    handleToggleStatus,
    handleEditUser,
    handleCreateSuccess,
    handleEditSuccess,
    handlePermissionsSuccess,
    formatDate,
    users,
    pagination,
    selectedUserPermissions,
    permissionsByCategory,
  };
}
