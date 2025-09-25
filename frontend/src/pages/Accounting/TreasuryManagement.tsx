// pages/Accounting/TreasuryManagement.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, TrendingUp, TrendingDown, Wallet, Calendar, Download, Upload, BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateCashFlowModal } from '../../components/Modals/Create/CreateCashFlowModal';
import { ViewCashFlowModal } from '../../components/Modals/View/ViewCashFlowModal';

const cashFlowService = createCrudService('cash-flows');
const accountService = createCrudService('accounts');

interface TreasurySummary {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
}

export const TreasuryManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCashFlow, setSelectedCashFlow] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');

  // Récupérer les flux de trésorerie
  const { data: cashFlowsData, isLoading, error } = useQuery({
    queryKey: ['cash-flows', page, search, typeFilter, accountFilter, dateRange],
    queryFn: () => cashFlowService.getAll({ 
      page, 
      limit: 10, 
      search, 
      type: typeFilter,
      accountId: accountFilter,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    })
  });

  // Récupérer les comptes pour les filtres
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountService.getAll({ limit: 100 })
  });

  const deleteCashFlowMutation = useMutation({
    mutationFn: (id: number) => cashFlowService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flows'] });
    }
  });

  // Calculer les résumés de trésorerie
  const treasurySummary: TreasurySummary = useMemo(() => {
    if (!cashFlowsData?.data?.cashFlows) {
      return {
        totalInflows: 0,
        totalOutflows: 0,
        netCashFlow: 0,
        openingBalance: 0,
        closingBalance: 0
      };
    }

    const inflows = cashFlowsData.data.cashFlows
      .filter((flow: any) => flow.type === 'INFLOW')
      .reduce((sum: number, flow: any) => sum + flow.amount, 0);

    const outflows = cashFlowsData.data.cashFlows
      .filter((flow: any) => flow.type === 'OUTFLOW')
      .reduce((sum: number, flow: any) => sum + flow.amount, 0);

    // Calcul approximatif du solde d'ouverture et de clôture
    // En réalité, cela devrait venir d'une API dédiée
    const openingBalance = 0; // À implémenter avec une API spécifique
    const netCashFlow = inflows - outflows;
    const closingBalance = openingBalance + netCashFlow;

    return {
      totalInflows: inflows,
      totalOutflows: outflows,
      netCashFlow,
      openingBalance,
      closingBalance
    };
  }, [cashFlowsData]);

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
        Erreur lors du chargement des flux de trésorerie
      </div>
    );
  }

  const cashFlows = cashFlowsData?.data?.cashFlows || [];
  const pagination = cashFlowsData?.data?.pagination;
  const accounts = accountsData?.data?.accounts || [];

  const handleViewCashFlow = (cashFlow: any) => {
    setSelectedCashFlow(cashFlow);
    setShowViewModal(true);
  };

  const handleDeleteCashFlow = async (cashFlow: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ce flux de trésorerie ?`)) {
      try {
        await deleteCashFlowMutation.mutateAsync(cashFlow.id);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const exportToExcel = () => {
    // Implémentation simplifiée de l'export Excel
    const data = cashFlows.map((flow: any) => ({
      Date: formatDate(flow.date),
      Description: flow.description,
      Type: flow.type === 'INFLOW' ? 'Entrée' : 'Sortie',
      Montant: flow.amount,
      Compte: flow.account?.name,
      'Solde après opération': flow.balanceAfter
    }));

    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tresorerie-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de la Trésorerie</h1>
          <p className="text-gray-600">Suivi des flux financiers et prévisions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
          {hasPermission('cash-flows.create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Flux</span>
            </button>
          )}
        </div>
      </div>

      {/* Résumé de trésorerie */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(treasurySummary.totalInflows)}
              </div>
              <div className="text-sm text-gray-500">Entrées totales</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(treasurySummary.totalOutflows)}
              </div>
              <div className="text-sm text-gray-500">Sorties totales</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <div className={`text-2xl font-bold ${
                treasurySummary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(treasurySummary.netCashFlow)}
              </div>
              <div className="text-sm text-gray-500">Flux net</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-gray-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {formatCurrency(treasurySummary.openingBalance)}
              </div>
              <div className="text-sm text-gray-500">Solde d'ouverture</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <div className={`text-2xl font-bold ${
                treasurySummary.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(treasurySummary.closingBalance)}
              </div>
              <div className="text-sm text-gray-500">Solde de clôture</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres avancés */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher un flux..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les types</option>
              <option value="INFLOW">Entrées</option>
              <option value="OUTFLOW">Sorties</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compte</label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les comptes</option>
              {accounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.accountNumber} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Boutons de vue */}
        <div className="flex justify-end mt-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                viewMode === 'chart'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Graphique
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      <CreateCashFlowModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <ViewCashFlowModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        cashFlow={selectedCashFlow}
      />

      {/* Vue Graphique */}
      {viewMode === 'chart' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Vue Graphique des Flux de Trésorerie
          </h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Graphique des flux de trésorerie</p>
              <p className="text-sm">(À implémenter avec une librairie de graphiques)</p>
            </div>
          </div>
        </div>
      )}

      {/* Vue Liste */}
      {viewMode === 'list' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compte
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cashFlows.map((cashFlow: any) => (
                <tr key={cashFlow.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(cashFlow.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {cashFlow.description}
                    </div>
                    <div className="text-sm text-gray-500">
                      {cashFlow.sourceDocumentType} #{cashFlow.sourceDocumentId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cashFlow.account?.accountNumber} - {cashFlow.account?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      cashFlow.type === 'INFLOW' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cashFlow.type === 'INFLOW' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {cashFlow.type === 'INFLOW' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={cashFlow.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}>
                      {cashFlow.type === 'INFLOW' ? '+' : '-'}{formatCurrency(cashFlow.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('cash-flows.read') && (
                        <button 
                          onClick={() => handleViewCashFlow(cashFlow)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('cash-flows.delete') && (
                        <button 
                          onClick={() => handleDeleteCashFlow(cashFlow)}
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
      )}

      {/* Section de prévisions (simplifiée) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Prévisions de Trésorerie</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(treasurySummary.totalInflows * 1.1)}
            </div>
            <div className="text-sm text-gray-500">Prévisions entrées (mois prochain)</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(treasurySummary.totalOutflows * 1.05)}
            </div>
            <div className="text-sm text-gray-500">Prévisions sorties (mois prochain)</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className={`text-2xl font-bold ${
              (treasurySummary.totalInflows * 1.1 - treasurySummary.totalOutflows * 1.05) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency(treasurySummary.totalInflows * 1.1 - treasurySummary.totalOutflows * 1.05)}
            </div>
            <div className="text-sm text-gray-500">Prévisions flux net</div>
          </div>
        </div>
      </div>
    </div>
  );
};