import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit, Eye, Send, Printer, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateInvoiceModal } from '../../components/Modals/Create/CreateInvoiceModal';

const invoiceService = createCrudService('invoices');

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: Clock },
  SENT: { label: 'Envoyée', color: 'bg-blue-100 text-blue-800', icon: Send },
  PAID: { label: 'Payée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  PARTIAL: { label: 'Partiellement payée', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  OVERDUE: { label: 'En retard', color: 'bg-red-100 text-red-800', icon: XCircle },
  CANCELLED: { label: 'Annulée', color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

export const InvoiceList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', page, search, statusFilter],
    queryFn: () => invoiceService.getAll({ page, limit: 10, search, status: statusFilter })
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      fetch(`/api/v1/invoices/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const handlePrint = (invoice: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Facture ${invoice.invoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .invoice-details { margin-bottom: 20px; }
              .table { width: 100%; border-collapse: collapse; }
              .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .table th { background-color: #f5f5f5; }
              .total { text-align: right; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>FACTURE</h1>
              <h2>${invoice.invoiceNumber}</h2>
            </div>
            <div class="invoice-details">
              <p><strong>Client:</strong> ${invoice.customer.name}</p>
              <p><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              <p><strong>Échéance:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Total HT</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items?.map((item: any) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPriceHt.toLocaleString()} FCFA</td>
                    <td>${item.totalHt.toLocaleString()} FCFA</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
            <div class="total">
              <p>Sous-total HT: ${invoice.subtotalHt.toLocaleString()} FCFA</p>
              <p>TVA: ${invoice.totalVat.toLocaleString()} FCFA</p>
              <p><strong>Total TTC: ${invoice.totalTtc.toLocaleString()} FCFA</strong></p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

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
        Erreur lors du chargement des factures
      </div>
    );
  }

  const invoices = data?.data?.invoices || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Factures</h1>
          <p className="text-gray-600">Créez et gérez vos factures clients</p>
        </div>
        {hasPermission('invoices.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Facture</span>
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
              placeholder="Rechercher une facture..."
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
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modales */}
      <CreateInvoiceModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      {/* Liste des factures */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Facture
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Échéance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créée par
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice: any) => {
              const statusInfo = statusConfig[invoice.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo?.icon || Clock;
              const isOverdue = new Date(invoice.dueDate) < new Date() && !['PAID', 'CANCELLED'].includes(invoice.status);
              
              return (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.customer.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {invoice.customer.customerNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF'
                      }).format(invoice.totalTtc)}
                    </div>
                    {invoice.balanceDue > 0 && (
                      <div className="text-sm text-red-600">
                        Reste: {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF'
                        }).format(invoice.balanceDue)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      isOverdue ? 'bg-red-100 text-red-800' : statusInfo?.color
                    }`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {isOverdue ? 'En retard' : statusInfo?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.creator.firstName} {invoice.creator.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('invoices.read') && (
                        <button className="text-blue-600 hover:text-blue-900" title="Voir détails">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handlePrint(invoice)}
                        className="text-purple-600 hover:text-purple-900" 
                        title="Imprimer"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900" title="Télécharger PDF">
                        <Download className="h-4 w-4" />
                      </button>
                      {hasPermission('invoices.update') && invoice.status === 'DRAFT' && (
                        <button className="text-indigo-600 hover:text-indigo-900" title="Modifier">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('invoices.send') && invoice.status === 'DRAFT' && (
                        <button 
                          onClick={() => updateStatusMutation.mutate({ id: invoice.id, status: 'SENT' })}
                          className="text-blue-600 hover:text-blue-900" 
                          title="Envoyer"
                        >
                          <Send className="h-4 w-4" />
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