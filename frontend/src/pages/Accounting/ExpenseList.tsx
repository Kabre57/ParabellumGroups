// pages/Accounting/ExpenseList.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, DollarSign, Calendar, User, FileText, Edit, Trash2, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateExpenseModal } from '../../components/Modals/Create/CreateExpenseModal';
import { ViewExpenseModal } from '../../components/Modals/View/ViewExpenseModal';

const expenseService = createCrudService('expenses');

const statusConfig = {
  PENDING: { label: 'En attente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Payée', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  REIMBURSED: { label: 'Remboursée', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: 'Annulée', icon: XCircle, color: 'bg-red-100 text-red-800' }
};

export const ExpenseList: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', page, search, statusFilter, categoryFilter],
    queryFn: () => expenseService.getAll({ 
      page, 
      limit: 10, 
      search, 
      status: statusFilter,
      category: categoryFilter
    })
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });

  const updateExpenseStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      expenseService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
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
        Erreur lors du chargement des dépenses
      </div>
    );
  }

  const expenses = data?.data?.expenses || [];
  const pagination = data?.data?.pagination;

  const handleViewExpense = (expense: any) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const handleStatusUpdate = async (expense: any, newStatus: string) => {
    try {
      await updateExpenseStatusMutation.mutateAsync({
        id: expense.id,
        status: newStatus
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const handleDeleteExpense = async (expense: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la dépense ${expense.description} ?`)) {
      try {
        await deleteExpenseMutation.mutateAsync(expense.id);
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

  const categories = ['Fournitures', 'Déplacement', 'Matériel', 'Formation', 'Logiciel', 'Autre'];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Dépenses</h1>
          <p className="text-gray-600">Suivez et géz vos dépenses professionnelles</p>
        </div>
        {hasPermission('expenses.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Dépense</span>
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
              placeholder="Rechercher une dépense..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="PAID">Payée</option>
            <option value="REIMBURSED">Remboursée</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Toutes catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modales */}
      <CreateExpenseModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <ViewExpenseModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        expense={selectedExpense}
      />

      {/* Liste des dépenses */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dépense
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employé
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
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
            {expenses.map((expense: any) => {
              const statusInfo = statusConfig[expense.status as keyof typeof statusConfig];
              
              return (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {expense.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {expense.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {expense.employee?.firstName} {expense.employee?.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo?.color}`}>
                      {statusInfo?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('expenses.read') && (
                        <button 
                          onClick={() => handleViewExpense(expense)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('expenses.update') && expense.status === 'PENDING' && (
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => handleStatusUpdate(expense, 'PAID')}
                            className="text-green-600 hover:text-green-900"
                            title="Marquer comme payée"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {hasPermission('expenses.delete') && (
                        <button 
                          onClick={() => handleDeleteExpense(expense)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination similaire aux autres pages */}
        {/* ... */}
      </div>
    </div>
  );
};