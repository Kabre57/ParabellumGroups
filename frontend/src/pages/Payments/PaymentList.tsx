import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Edit, Trash2, CreditCard, Banknote, Smartphone, Wallet } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreatePaymentModal } from '../../components/Modals/Create/CreatePaymentModal';

const paymentService = createCrudService('payments');

const paymentMethodConfig = {
  TRANSFER: { label: 'Virement', icon: CreditCard, color: 'text-blue-600' },
  CHECK: { label: 'Chèque', icon: Banknote, color: 'text-green-600' },
  CARD: { label: 'Carte', icon: Smartphone, color: 'text-purple-600' },
  CASH: { label: 'Espèces', icon: Wallet, color: 'text-yellow-600' },
  OTHER: { label: 'Autre', icon: CreditCard, color: 'text-gray-600' }
};

export const PaymentList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', page, search],
    queryFn: () => paymentService.getAll({ page, limit: 10, search })
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) => paymentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
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
        Erreur lors du chargement des paiements
      </div>
    );
  }

  const payments = data?.data?.payments || [];
  const pagination = data?.data?.pagination;

  const handleDeletePayment = async (payment: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le paiement ${payment.paymentNumber} ?`)) {
      try {
        await deletePaymentMutation.mutateAsync(payment.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Paiements</h1>
          <p className="text-gray-600">Enregistrez et suivez les paiements clients</p>
        </div>
        {hasPermission('payments.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Paiement</span>
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
              placeholder="Rechercher un paiement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Modales */}
      <CreatePaymentModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      {/* Liste des paiements */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paiement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mode de paiement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créé par
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment: any) => {
              const methodInfo = paymentMethodConfig[payment.paymentMethod as keyof typeof paymentMethodConfig];
              const MethodIcon = methodInfo?.icon || CreditCard;
              
              return (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.paymentNumber}
                      </div>
                      {payment.reference && (
                        <div className="text-sm text-gray-500">
                          Réf: {payment.reference}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.customer.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.customer.customerNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 ${methodInfo?.color}`}>
                      <MethodIcon className="h-3 w-3 mr-1" />
                      {methodInfo?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.creator.firstName} {payment.creator.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('payments.read') && (
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('payments.update') && (
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('payments.delete') && (
                        <button 
                          onClick={() => handleDeletePayment(payment)}
                          className="text-red-600 hover:text-red-900"
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(page - 1) * 10 + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(page * 10, pagination.total)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};