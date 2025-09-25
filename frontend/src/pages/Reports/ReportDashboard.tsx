import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, DollarSign, Users, FileText, Download, Printer, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';

const reportService = createCrudService('reports');

export const ReportDashboard: React.FC = () => {
  const { hasPermission } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', dateRange],
    queryFn: () => reportService.getAll({ 
      endpoint: 'sales',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }),
    enabled: hasPermission('reports.sales')
  });

  const { data: financialReport, isLoading: financialLoading } = useQuery({
    queryKey: ['reports', 'financial', dateRange],
    queryFn: () => reportService.getAll({ 
      endpoint: 'financial',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }),
    enabled: hasPermission('reports.financial')
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => reportService.getAll({ endpoint: 'dashboard' })
  });

  const handlePrintReport = (reportType: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const reportData = reportType === 'sales' ? salesReport : financialReport;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Rapport ${reportType === 'sales' ? 'de Ventes' : 'Financier'}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .table th { background-color: #f5f5f5; }
              .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>RAPPORT ${reportType === 'sales' ? 'DE VENTES' : 'FINANCIER'}</h1>
              <p>Période: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}</p>
            </div>
            <div class="summary">
              <h3>Résumé</h3>
              <p>Données du rapport pour la période sélectionnée</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const stats = dashboardStats?.data || {};

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Analyses</h1>
          <p className="text-gray-600">Analysez les performances de votre entreprise</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">à</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Clients actifs</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.customers?.active || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Devis en cours</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.quotes?.pending || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">CA du mois</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                      notation: 'compact'
                    }).format(stats.revenue?.monthly || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Factures impayées</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.invoices?.unpaid || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rapports disponibles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rapport de ventes */}
        {hasPermission('reports.sales') && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
                Rapport de Ventes
              </h3>
            </div>
            <div className="p-6">
              {salesLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Analyse des ventes par période, produit et client
                  </p>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handlePrintReport('sales')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Imprimer</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                      <Download className="h-4 w-4" />
                      <span>Exporter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rapport financier */}
        {hasPermission('reports.financial') && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                Rapport Financier
              </h3>
            </div>
            <div className="p-6">
              {financialLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Analyse financière complète avec trésorerie
                  </p>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handlePrintReport('financial')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Imprimer</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                      <Download className="h-4 w-4" />
                      <span>Exporter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};