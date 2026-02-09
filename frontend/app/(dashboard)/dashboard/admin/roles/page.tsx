'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  Search, 
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  adminRolesService, 
  adminPermissionsService, 
  type Role, 
  type Permission 
} from '@/shared/api/admin';
import { CreateRoleModal } from '@/components/roles/CreateRoleModal';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  GENERAL_DIRECTOR: 'bg-purple-100 text-purple-800',
  SERVICE_MANAGER: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-gray-100 text-gray-800',
  ACCOUNTANT: 'bg-green-100 text-green-800',
  PURCHASING_MANAGER: 'bg-yellow-100 text-yellow-800',
  COMMERCIAL: 'bg-orange-100 text-orange-800',
  TECHNICIAN: 'bg-indigo-100 text-indigo-800',
};

export default function RolesPermissionsPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesService.getRoles(true),
  });

  const roles = Array.isArray(rolesData?.data) ? rolesData.data : [];

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => adminPermissionsService.getPermissions(),
  });

  const allPermissions = Array.isArray(permissionsData?.data) ? permissionsData.data : [];

  const { data: rolePermissionsData } = useQuery({
    queryKey: ['admin-role-permissions', selectedRoleId],
    queryFn: () => adminRolesService.getRolePermissions(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  const rolePermissions = Array.isArray(rolePermissionsData?.data) ? rolePermissionsData.data : [];

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: number) => adminRolesService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setSelectedRoleId(null);
      toast.success('Role supprime');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression');
    }
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) {
      toast.error('Impossible de supprimer un role systeme');
      return;
    }
    if (confirm(`Supprimer le role "${role.name}" ?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    const category = perm.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredCategories = Object.keys(groupedPermissions).filter(category =>
    groupedPermissions[category].some(perm =>
      perm.name.toLowerCase().includes(search.toLowerCase()) ||
      perm.description?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const getPermissionValue = (permissionId: number, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canApprove'): boolean => {
    const rp = rolePermissions.find(p => p.permissionId === permissionId);
    return rp ? rp[field] : false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Roles et Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configurez les permissions pour chaque role
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Role
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Selectionner un role
        </label>
        {rolesLoading ? (
          <div className="text-center py-4">Chargement des roles...</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Aucun role trouve</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {roles.map((role) => (
              <div key={role.id} className="relative">
                <button
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    selectedRoleId === role.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Shield className={`h-5 w-5 ${selectedRoleId === role.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <span className="font-medium text-gray-900 block">{role.name}</span>
                      <span className="text-xs text-gray-500">{role.code}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {role.isSystem && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">Systeme</span>
                    )}
                    {!role.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">Inactif</span>
                    )}
                  </div>
                </button>
                {!role.isSystem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRole(role);
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRoleId && (
        <>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher une permission..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            {permissionsLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Chargement...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune permission</h3>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCategories.map((category) => {
                  const permissions = groupedPermissions[category];
                  const isExpanded = expandedCategories.has(category);

                  return (
                    <div key={category}>
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                          <h3 className="text-base font-semibold text-gray-900 capitalize">
                            {category}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {permissions.length}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-gray-50 px-6 py-4">
                          <table className="min-w-full">
                            <thead>
                              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                                <th className="pb-3 pr-4">Permission</th>
                                <th className="pb-3 px-2 text-center w-20">Voir</th>
                                <th className="pb-3 px-2 text-center w-20">Creer</th>
                                <th className="pb-3 px-2 text-center w-20">Modifier</th>
                                <th className="pb-3 px-2 text-center w-20">Supprimer</th>
                                <th className="pb-3 px-2 text-center w-20">Approuver</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {permissions.map((perm) => (
                                <tr key={perm.id} className="text-sm">
                                  <td className="py-3 pr-4">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900">
                                        {perm.name}
                                      </span>
                                      {perm.description && (
                                        <span className="text-xs text-gray-500">
                                          {perm.description}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map((field) => {
                                    const value = getPermissionValue(perm.id, field);
                                    return (
                                      <td key={field} className="py-3 px-2 text-center">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${
                                          value
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}>
                                          {value ? (
                                            <Check className="h-4 w-4" />
                                          ) : (
                                            <X className="h-4 w-4" />
                                          )}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <Shield className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">
                  Role actuel : {selectedRole?.name}
                </h4>
                <p className="mt-1 text-sm text-blue-700">
                  Les permissions affichees sont en lecture seule. Utilisez l'API pour modifier les permissions des roles.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <CreateRoleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}
