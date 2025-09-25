import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Eye, CheckCircle, XCircle, Clock, Download, Send, Printer } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateQuoteModal } from '../../components/Modals/Create/CreateQuoteModal';
import { ViewQuoteModal } from '../../components/Modals/View/ViewQuoteModal';
import { EditQuoteModal } from '../../components/Modals/Edit/EditQuoteModal';

const quoteService = createCrudService('quotes');

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: Clock },
  SUBMITTED_FOR_SERVICE_APPROVAL: { label: 'En attente service', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED_BY_SERVICE_MANAGER: { label: 'Approuvé service', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  REJECTED_BY_SERVICE_MANAGER: { label: 'Rejeté service', color: 'bg-red-100 text-red-800', icon: XCircle },
  SUBMITTED_FOR_DG_APPROVAL: { label: 'En attente DG', color: 'bg-orange-100 text-orange-800', icon: Clock },
  APPROVED_BY_DG: { label: 'Approuvé DG', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED_BY_DG: { label: 'Rejeté DG', color: 'bg-red-100 text-red-800', icon: XCircle },
  ACCEPTED_BY_CLIENT: { label: 'Accepté client', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED_BY_CLIENT: { label: 'Rejeté client', color: 'bg-red-100 text-red-800', icon: XCircle },
  EXPIRED: { label: 'Expiré', color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

export const QuoteList: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['quotes', page, search, statusFilter],
    queryFn: () => quoteService.getAll({ page, limit: 10, search, status: statusFilter })
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments?: string }) => 
      fetch(`/api/v1/quotes/${id}/approve`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comments })
      }).then(res => {
        if (!res.ok) throw new Error('Erreur lors de l\'approbation');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error) => {
      alert(`Erreur: ${error.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments: string }) => 
      fetch(`/api/v1/quotes/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comments })
      }).then(res => {
        if (!res.ok) throw new Error('Erreur lors du rejet');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error) => {
      alert(`Erreur: ${error.message}`);
    }
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/v1/quotes/${id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(res => {
        if (!res.ok) throw new Error('Erreur lors de la soumission');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    }
  });

  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
    setShowViewModal(true);
  };

  const handleEditQuote = (quote: any) => {
    setSelectedQuote(quote);
    setShowEditModal(true);
  };

  const handleApprove = async (quote: any) => {
    const comments = prompt('Commentaires (optionnel):');
    if (comments === null) return; // User cancelled
    
    try {
      await approveMutation.mutateAsync({ id: quote.id, comments: comments || undefined });
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
    }
  };

  const handleReject = async (quote: any) => {
    const comments = prompt('Motif du rejet (requis):');
    if (!comments) return;
    
    try {
      await rejectMutation.mutateAsync({ id: quote.id, comments });
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
    }
  };

  const handleSubmit = async (quote: any) => {
    if (!confirm('Soumettre ce devis pour approbation?')) return;
    
    try {
      await submitMutation.mutateAsync(quote.id);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const handlePrint = (quote: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Devis ${quote.quoteNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .quote-details { margin-bottom: 20px; }
              .table { width: 100%; border-collapse: collapse; }
              .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .table th { background-color: #f5f5f5; }
              .total { text-align: right; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>DEVIS</h1>
              <h2>${quote.quoteNumber}</h2>
            </div>
            <div class="quote-details">
              <p><strong>Client:</strong> ${quote.customer.name}</p>
              <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</p>
              <p><strong>Validité:</strong> Jusqu'au ${new Date(quote.validUntil).toLocaleDateString()}</p>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantité</th>
                  <th>Prix unitaire HT</th>
                  <th>Total HT</th>
                </tr>
              </thead>
              <tbody>
                ${quote.items?.map((item: any) => `
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
              <p>Sous-total HT: ${quote.subtotalHt.toLocaleString()} FCFA</p>
              <p>TVA: ${quote.totalVat.toLocaleString()} FCFA</p>
              <p><strong>Total TTC: ${quote.totalTtc.toLocaleString()} FCFA</strong></p>
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
        Erreur lors du chargement des devis
      </div>
    );
  }

  const quotes = data?.data?.quotes || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Devis</h1>
          <p className="text-gray-600">Créez et gérez vos devis avec approbation</p>
        </div>
        {hasPermission('quotes.create') && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Devis</span>
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
              placeholder="Rechercher un devis..."
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
      <CreateQuoteModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <ViewQuoteModal 
        isOpen={showViewModal} 
        onClose={() => setShowViewModal(false)}
        quote={selectedQuote}
      />
      
      <EditQuoteModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        quote={selectedQuote}
      />

      {/* Liste des devis */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Devis
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
                Créé par
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotes.map((quote: any) => {
              const statusInfo = statusConfig[quote.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo?.icon || Clock;
              
              return (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {quote.quoteNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        Valide jusqu'au {new Date(quote.validUntil).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quote.customer.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {quote.customer.customerNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format(quote.totalTtc)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo?.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quote.creator.firstName} {quote.creator.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('quotes.read') && (
                        <button 
                          onClick={() => handleViewQuote(quote)}
                          className="text-blue-600 hover:text-blue-900" 
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handlePrint(quote)}
                        className="text-purple-600 hover:text-purple-900" 
                        title="Imprimer"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      
                      <button 
                        className="text-green-600 hover:text-green-900" 
                        title="Télécharger PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {hasPermission('quotes.update') && quote.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleEditQuote(quote)}
                          className="text-indigo-600 hover:text-indigo-900" 
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('quotes.submit') && quote.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleSubmit(quote)}
                          className="text-blue-600 hover:text-blue-900" 
                          title="Soumettre pour approbation"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('quotes.approve_service') && quote.status === 'SUBMITTED_FOR_SERVICE_APPROVAL' && (
                        <>
                          <button 
                            onClick={() => handleApprove(quote)}
                            className="text-green-600 hover:text-green-900" 
                            title="Approuver"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(quote)}
                            className="text-red-600 hover:text-red-900" 
                            title="Rejeter"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {hasPermission('quotes.approve_dg') && quote.status === 'SUBMITTED_FOR_DG_APPROVAL' && (
                        <>
                          <button 
                            onClick={() => handleApprove(quote)}
                            className="text-green-600 hover:text-green-900" 
                            title="Approuver"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(quote)}
                            className="text-red-600 hover:text-red-900" 
                            title="Rejeter"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
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