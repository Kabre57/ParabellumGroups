'use client';

import React, { useState } from 'react';
import { X, Shield, Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess?: () => void;
}

const permissionCategories = {
  'dashboard': {
    label: 'Tableau de Bord',
    permissions: [
      { id: 'dashboard.view', name: 'Voir le tableau de bord', description: 'Accès à la page principale' },
      { id: 'dashboard.analytics', name: 'Analytics', description: 'Voir les statistiques avancées' },
    ]
  },
  'users': {
    label: 'Utilisateurs',
    permissions: [
      { id: 'users.read', name: 'Voir les utilisateurs', description: 'Accès à la liste des utilisateurs' },
      { id: 'users.create', name: 'Créer des utilisateurs', description: 'Créer de nouveaux comptes' },
      { id: 'users.update', name: 'Modifier les utilisateurs', description: 'Modifier les comptes existants' },
      { id: 'users.delete', name: 'Supprimer les utilisateurs', description: 'Supprimer des comptes' },
      { id: 'users.manage_permissions', name: 'Gérer les permissions', description: 'Modifier les permissions des utilisateurs' },
    ]
  },
  'customers': {
    label: 'Clients',
    permissions: [
      { id: 'customers.read', name: 'Voir les clients', description: 'Accès à la liste des clients' },
      { id: 'customers.create', name: 'Créer des clients', description: 'Ajouter de nouveaux clients' },
      { id: 'customers.update', name: 'Modifier les clients', description: 'Modifier les informations clients' },
      { id: 'customers.delete', name: 'Supprimer les clients', description: 'Supprimer des clients' },
    ]
  },
  'quotes': {
    label: 'Devis',
    permissions: [
      { id: 'quotes.read', name: 'Voir les devis', description: 'Accès à la liste des devis' },
      { id: 'quotes.create', name: 'Créer des devis', description: 'Créer de nouveaux devis' },
      { id: 'quotes.update', name: 'Modifier les devis', description: 'Modifier les devis existants' },
      { id: 'quotes.delete', name: 'Supprimer les devis', description: 'Supprimer des devis' },
      { id: 'quotes.approve', name: 'Approuver les devis', description: 'Valider ou rejeter des devis' },
    ]
  },
  'invoices': {
    label: 'Factures',
    permissions: [
      { id: 'invoices.read', name: 'Voir les factures', description: 'Accès à la liste des factures' },
      { id: 'invoices.create', name: 'Créer des factures', description: 'Créer de nouvelles factures' },
      { id: 'invoices.update', name: 'Modifier les factures', description: 'Modifier les factures existantes' },
      { id: 'invoices.delete', name: 'Supprimer les factures', description: 'Supprimer des factures' },
    ]
  },
  'payments': {
    label: 'Paiements',
    permissions: [
      { id: 'payments.read', name: 'Voir les paiements', description: 'Accès à la liste des paiements' },
      { id: 'payments.create', name: 'Enregistrer des paiements', description: 'Enregistrer de nouveaux paiements' },
      { id: 'payments.update', name: 'Modifier les paiements', description: 'Modifier les paiements' },
      { id: 'payments.delete', name: 'Supprimer les paiements', description: 'Supprimer des paiements' },
    ]
  },
  'products': {
    label: 'Produits',
    permissions: [
      { id: 'products.read', name: 'Voir les produits', description: 'Accès au catalogue' },
      { id: 'products.create', name: 'Créer des produits', description: 'Ajouter des produits' },
      { id: 'products.update', name: 'Modifier les produits', description: 'Modifier les produits' },
      { id: 'products.delete', name: 'Supprimer les produits', description: 'Supprimer des produits' },
    ]
  },
  'projects': {
    label: 'Projets',
    permissions: [
      { id: 'projects.read', name: 'Voir les projets', description: 'Accès à la liste des projets' },
      { id: 'projects.create', name: 'Créer des projets', description: 'Créer de nouveaux projets' },
      { id: 'projects.update', name: 'Modifier les projets', description: 'Modifier les projets' },
      { id: 'projects.delete', name: 'Supprimer les projets', description: 'Supprimer des projets' },
    ]
  },
  'technical': {
    label: 'Service Technique',
    permissions: [
      { id: 'technical.missions.read', name: 'Voir les missions', description: 'Accès aux missions' },
      { id: 'technical.missions.create', name: 'Créer des missions', description: 'Créer des missions' },
      { id: 'technical.interventions.read', name: 'Voir les interventions', description: 'Accès aux interventions' },
      { id: 'technical.interventions.create', name: 'Créer des interventions', description: 'Planifier des interventions' },
      { id: 'technical.equipment.read', name: 'Voir le matériel', description: 'Accès au matériel' },
      { id: 'technical.equipment.manage', name: 'Gérer le matériel', description: 'Gérer le matériel' },
    ]
  },
  'reports': {
    label: 'Rapports',
    permissions: [
      { id: 'reports.sales', name: 'Rapports de ventes', description: 'Voir les rapports de ventes' },
      { id: 'reports.financial', name: 'Rapports financiers', description: 'Voir les rapports financiers' },
      { id: 'reports.inventory', name: 'Rapports de stock', description: 'Voir les rapports de stock' },
      { id: 'reports.export', name: 'Exporter les rapports', description: 'Exporter les données' },
    ]
  },
};

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(permissionCategories)));
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    // TODO: Charger les permissions actuelles de l'utilisateur
    // const userPermissions = await apiClient.get(`/api/v1/users/${user.id}/permissions`);
    // setSelectedPermissions(new Set(userPermissions.data));
    
    // Simulation - Permissions par défaut selon le rôle
    const defaultPermissions = new Set<string>();
    if (user?.role === 'ADMIN') {
      Object.values(permissionCategories).forEach(category => {
        category.permissions.forEach(perm => defaultPermissions.add(perm.id));
      });
    } else if (user?.role === 'COMMERCIAL') {
      defaultPermissions.add('dashboard.view');
      defaultPermissions.add('customers.read');
      defaultPermissions.add('customers.create');
      defaultPermissions.add('quotes.read');
      defaultPermissions.add('quotes.create');
    }
    setSelectedPermissions(defaultPermissions);
  }, [user]);

  const togglePermission = (permissionId: string) => {
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
    permissionCategories[categoryKey as keyof typeof permissionCategories].permissions.forEach(perm => {
      newPermissions.add(perm.id);
    });
    setSelectedPermissions(newPermissions);
  };

  const deselectAllInCategory = (categoryKey: string) => {
    const newPermissions = new Set(selectedPermissions);
    permissionCategories[categoryKey as keyof typeof permissionCategories].permissions.forEach(perm => {
      newPermissions.delete(perm.id);
    });
    setSelectedPermissions(newPermissions);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // TODO: Remplacer par l'appel API réel
      // await apiClient.put(`/api/v1/users/${user.id}/permissions`, {
      //   permissions: Array.from(selectedPermissions)
      // });
      
      console.log('Permissions mises à jour:', Array.from(selectedPermissions));
      
      // Simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Permissions mises à jour avec succès');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur mise à jour permissions:', error);
      toast.error(error?.message || 'Erreur lors de la mise à jour des permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = Object.entries(permissionCategories).map(([key, category]) => ({
    key,
    ...category,
    permissions: category.permissions.filter(perm =>
      searchQuery === '' ||
      perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.permissions.length > 0);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              Gérer les Permissions
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {user?.firstName} {user?.lastName} - {user?.role}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Recherche */}
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

        {/* Liste des permissions */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {filteredCategories.map(({ key, label, permissions }) => {
              const allSelected = permissions.every(perm => selectedPermissions.has(perm.id));
              const someSelected = permissions.some(perm => selectedPermissions.has(perm.id));
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
                        ({permissions.filter(p => selectedPermissions.has(p.id)).length}/{permissions.length})
                      </span>
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => selectAllInCategory(key)}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Tout sélectionner
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        type="button"
                        onClick={() => deselectAllInCategory(key)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {permissions.map((permission) => {
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
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {permission.description}
                              </p>
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{selectedPermissions.size}</span> permission(s) sélectionnée(s)
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
                disabled={isSubmitting}
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
