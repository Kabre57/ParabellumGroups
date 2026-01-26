'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  Search, 
  Edit,
  ChevronDown,
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  id: number;
  name: string;
  description?: string;
  category: string;
}

interface RolePermission {
  id: number;
  role: string;
  permissionId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  permission: Permission;
}

interface RolePermissionsResponse {
  success: boolean;
  data: RolePermission[];
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrateur', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'GENERAL_DIRECTOR', label: 'Directeur Général', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'SERVICE_MANAGER', label: 'Responsable de Service', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'EMPLOYEE', label: 'Employé', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'ACCOUNTANT', label: 'Comptable', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'PURCHASING_MANAGER', label: 'Responsable Achat', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
];

export default function RolesPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN');
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Fetch role permissions
  const { data: rolePermissionsData, isLoading } = useQuery<RolePermissionsResponse>({
    queryKey: ['role-permissions', selectedRole],
    queryFn: async () => {
      // TODO: Remplacer par l'appel API réel
      // return apiClient.get(`/api/v1/permissions/roles/${selectedRole}`);
      
      // Données mockées temporaires
      return {
        success: true,
        data: [],
      };
    },
    enabled: !!selectedRole,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, data }: { permissionId: number; data: Partial<RolePermission> }) => {
      // TODO: Remplacer par l'appel API réel
      // return apiClient.put(`/api/v1/permissions/roles/${selectedRole}/${permissionId}`, data);
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRole] });
      toast.success('Permission mise à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la mise à jour de la permission');
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

  const handlePermissionToggle = (permissionId: number, field: keyof Omit<RolePermission, 'id' | 'role' | 'permissionId' | 'permission'>, currentValue: boolean) => {
    updatePermissionMutation.mutate({
      permissionId,
      data: { [field]: !currentValue },
    });
  };

  const rolePermissions = rolePermissionsData?.data || [];
  
  // Group permissions by category
  const groupedPermissions = rolePermissions.reduce((acc, rp) => {
    const category = rp.permission.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(rp);
    return acc;
  }, {} as Record<string, RolePermission[]>);

  const filteredCategories = Object.keys(groupedPermissions).filter(category =>
    groupedPermissions[category].some(rp =>
      rp.permission.name.toLowerCase().includes(search.toLowerCase()) ||
      rp.permission.description?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const currentRole = ROLES.find(r => r.value === selectedRole);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Rôles et Permissions</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configurez les permissions pour chaque rôle
        </p>
      </div>

      {/* Sélecteur de rôle */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Sélectionner un rôle
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={`relative flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                selectedRole === role.value
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Shield className={`h-5 w-5 ${selectedRole === role.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900 dark:text-white">{role.label}</span>
              </div>
              {selectedRole === role.value && (
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher une permission..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Liste des permissions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune permission</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {search ? 'Aucune permission ne correspond à votre recherche' : 'Aucune permission configurée pour ce rôle'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCategories.map((category) => {
              const permissions = groupedPermissions[category];
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                        {category}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {permissions.length}
                      </span>
                    </div>
                  </button>

                  {/* Permissions List */}
                  {isExpanded && (
                    <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <th className="pb-3 pr-4">Permission</th>
                            <th className="pb-3 px-2 text-center w-20">Voir</th>
                            <th className="pb-3 px-2 text-center w-20">Créer</th>
                            <th className="pb-3 px-2 text-center w-20">Modifier</th>
                            <th className="pb-3 px-2 text-center w-20">Supprimer</th>
                            <th className="pb-3 px-2 text-center w-20">Approuver</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {permissions.map((rp) => (
                            <tr key={rp.id} className="text-sm">
                              <td className="py-3 pr-4">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {rp.permission.name}
                                  </span>
                                  {rp.permission.description && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {rp.permission.description}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map((field) => (
                                <td key={field} className="py-3 px-2 text-center">
                                  <button
                                    onClick={() => handlePermissionToggle(rp.permissionId, field, rp[field])}
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                                      rp[field]
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {rp[field] ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )}
                                  </button>
                                </td>
                              ))}
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

      {/* Légende */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Rôle actuel : {currentRole?.label}
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
              Cliquez sur les icônes pour activer/désactiver les permissions. Les modifications sont enregistrées automatiquement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
