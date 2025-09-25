// pages/Accounting/AccountManagement.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building, CreditCard, TrendingUp, TrendingDown, Edit, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateAccountModal } from '../../components/Modals/Create/CreateAccountModal';
import { ViewAccountModal } from '../../components/Modals/View/ViewAccountModal';

const accountService = createCrudService('accounts');

export const AccountManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts', page, search],
    queryFn: () => accountService.getAll({ page, limit: 10, search })
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => accountService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Erreur lors du chargement des comptes
      </div>
    );
  }

  const accounts = data?.data?.accounts || [];
  const pagination = data?.data?.pagination;

  const handleViewAccount = (account: any) => {
    setSelectedAccount(account);
    setShowViewModal(true);
  };

  const handleDeleteAccount = async (account: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte ${account.name} ?`)) {
      try {
        await deleteAccountMutation.mutateAsync(account.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      'actif': 'bg-green-100 text-green-800',
      'passif': 'bg-red-100 text-red-800',
      'produit': 'bg-blue-100 text-blue-800',
      'charge': 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Comptes</h1>
          <p className="text-gray-600">Plan comptable et gestion des écritures</p>
        </div>
        {hasPermission('accounts.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Compte</span>
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un compte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Modales */}
      <CreateAccountModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <ViewAccountModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        account={selectedAccount}
      />

      {/* Liste des comptes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compte
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Solde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account: any) => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {account.accountNumber} - {account.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(account.accountType)}`}>
                    {account.accountType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center">
                    {account.balance >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                    )}
                    {formatCurrency(account.balance)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    account.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {account.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {hasPermission('accounts.read') && (
                      <button 
                        onClick={() => handleViewAccount(account)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('accounts.update') && (
                      <button 
                        onClick={() => {/* TODO: Edit modal */}}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('accounts.delete') && (
                      <button 
                        onClick={() => handleDeleteAccount(account)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination similaire aux autres pages */}
        {/* ... */}
      </div>
    </div>
  );
};