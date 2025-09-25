// pages/Purchases/PurchaseManagement.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, FileText, Truck, CheckCircle, XCircle, Clock, Edit, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreatePurchaseOrderModal } from '../../components/Modals/Create/CreatePurchaseOrderModal';
import { ViewPurchaseOrderModal } from '../../components/Modals/View/ViewPurchaseOrderModal';

const purchaseService = createCrudService('purchases');

const statusConfig = {
  PENDING: { label: 'En attente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Approuvée', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejetée', icon: XCircle, color: 'bg-red-100 text-red-800' },
  PARTIALLY_RECEIVED: { label: 'Partiellement reçue', icon: Truck, color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Terminée', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Annulée', icon: XCircle, color: 'bg-gray-100 text-gray-800' }
};

export const PurchaseManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['purchases', page, search, statusFilter],
    queryFn: () => purchaseService.getAll({ 
      page, 
      limit: 10, 
      search, 
      status: statusFilter 
    })
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: (id: number) => purchaseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    }
  });

  const updatePurchaseStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      purchaseService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
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
        Erreur lors du chargement des commandes d'achat
      </div>
    );
  }

  const purchases = data?.data?.purchases || [];
  const pagination = data?.data?.pagination;

  const handleViewPurchase = (purchase: any) => {
    setSelectedPurchase(purchase);
    setShowViewModal(true);
  };

  const handleStatusUpdate = async (purchase: any, newStatus: string) => {
    try {
      await updatePurchaseStatusMutation.mutateAsync({
        id: purchase.id,
        status: newStatus
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const handleDeletePurchase = async (purchase: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la commande ${purchase.orderNumber} ?`)) {
      try {
        await deletePurchaseMutation.mutateAsync(purchase.id);
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

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes d'Achat</h1>
          <p className="text-gray-600">Gérez vos approvisionnements et fournisseurs</p>
        </div>
        {hasPermission('purchases.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Commande</span>
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
              placeholder="Rechercher une commande..."
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
            <option value="APPROVED">Approuvée</option>
            <option value="PARTIALLY_RECEIVED">Partiellement reçue</option>
            <option value="COMPLETED">Terminée</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>
      </div>

      {/* Modales */}
      <CreatePurchaseOrderModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <ViewPurchaseOrderModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        purchase={selectedPurchase}
      />

      {/* Liste des commandes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commande
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fournisseur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
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
            {purchases.map((purchase: any) => {
              const statusInfo = statusConfig[purchase.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo?.icon || Clock;
              
              return (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {purchase.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {purchase.items?.length || 0} articles
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {purchase.supplier?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {purchase.supplier?.contactName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(purchase.orderDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(purchase.totalTtc)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo?.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('purchases.read') && (
                        <button 
                          onClick={() => handleViewPurchase(purchase)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('purchases.update') && purchase.status === 'PENDING' && (
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => handleStatusUpdate(purchase, 'APPROVED')}
                            className="text-green-600 hover:text-green-900"
                            title="Approuver"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(purchase, 'REJECTED')}
                            className="text-red-600 hover:text-red-900"
                            title="Rejeter"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {hasPermission('purchases.delete') && (
                        <button 
                          onClick={() => handleDeletePurchase(purchase)}
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