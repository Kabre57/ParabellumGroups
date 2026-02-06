'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminUsersService, adminPermissionsService } from '@/shared/api/admin/admin.service';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess?: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions-modal'],
    queryFn: () => adminPermissionsService.getPermissions(),
    enabled: isOpen,
  });

  const { data: userPermissionsData, isLoading: userPermissionsLoading } = useQuery({
    queryKey: ['admin-user-permissions', user?.id],
    queryFn: () => adminUsersService.getUserPermissions(user.id),
    enabled: isOpen && !!user?.id,
  });

  const permissions = permissionsData?.data || [];
  const userPermissions = userPermissionsData?.data || [];

  const permissionsByCategory = permissions.reduce((acc: Record<string, any[]>, perm: any) => {
    const category = perm.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  useEffect(() => {
    if (userPermissions.length > 0) {
      const permIds = new Set(userPermissions.map((up: any) => up.permissionId || up.permission?.id));
      setSelectedPermissions(permIds);
    }
    if (Object.keys(permissionsByCategory).length > 0) {
      setExpandedCategories(new Set(Object.keys(permissionsByCategory)));
    }
  }, [userPermissions, permissions]);

  const togglePermission = (permissionId: number) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId);
    } else {
      newPermissions.add(permissionId);
    }
    setSelectedPermissions(newPermissions);
  };

  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAllInCategory = (categoryKey: string) => {
    const newPermissions = new Set(selectedPermissions);
    permissionsByCategory[categoryKey]?.forEach((perm: any) => {
      newPermissions.add(perm.id);
    });
    setSelectedPermissions(newPermissions);
  };

  const deselectAllInCategory = (categoryKey: string) => {
    const newPermissions = new Set(selectedPermissions);
    permissionsByCategory[categoryKey]?.forEach((perm: any) => {
      newPermissions.delete(perm.id);
    });
    setSelectedPermissions(newPermissions);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      await adminUsersService.setUserPermissions(user.id, {
        permissionIds: Array.from(selectedPermissions)
      });
      
      toast.success('Permissions mises a jour avec succes');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur mise a jour permissions:', error);
      toast.error(error?.message || 'Erreur lors de la mise a jour des permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = Object.entries(permissionsByCategory).map(([key, perms]) => ({
    key,
    label: key,
    permissions: (perms as any[]).filter((perm: any) =>
      searchQuery === '' ||
      perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (perm.description && perm.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(category => category.permissions.length > 0);

  const isLoading = permissionsLoading || userPermissionsLoading;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              Gerer les Permissions
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {user?.firstName} {user?.lastName} - {user?.role?.name || user?.role}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une permission..."
              className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-500">Chargement des permissions...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune permission trouvee
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map(({ key, label, permissions: categoryPerms }) => {
                const allSelected = categoryPerms.every((perm: any) => selectedPermissions.has(perm.id));
                const isExpanded = expandedCategories.has(key);

                return (
                  <div key={key} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleCategory(key)}
                        className="flex items-center flex-1 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400 mr-2" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 mr-2" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          ({categoryPerms.filter((p: any) => selectedPermissions.has(p.id)).length}/{categoryPerms.length})
                        </span>
                      </button>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => selectAllInCategory(key)}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Tout selectionner
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button
                          type="button"
                          onClick={() => deselectAllInCategory(key)}
                          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Tout deselectionner
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {categoryPerms.map((permission: any) => {
                          const isSelected = selectedPermissions.has(permission.id);
                          return (
                            <label
                              key={permission.id}
                              className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                            >
                              <div className="flex items-center h-5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePermission(permission.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </div>
                              <div className="ml-3">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {permission.name}
                                </span>
                                {permission.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="ml-auto h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{selectedPermissions.size}</span> permission(s) selectionnee(s)
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Enregistrer les permissions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
