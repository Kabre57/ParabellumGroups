import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText, 
  Download, 
  Printer, 
  Calendar,
  Filter,
  Eye,
  PieChart,
  Activity
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { SalesChart } from '../../components/Charts/SalesChart';
import { RevenueChart } from '../../components/Charts/RevenueChart';

const reportService = createCrudService('reports');

export const ReportList: React.FC = () => {
  const { hasPermission } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('sales');

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

  const { data: interventionReport, isLoading: interventionLoading } = useQuery({
    queryKey: ['reports', 'interventions', dateRange],
    queryFn: () => reportService.getAll({ 
      endpoint: 'interventions',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }),
    enabled: hasPermission('interventions.read')
  });

  const handlePrintReport = (reportData: any, type: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Rapport ${type === 'sales' ? 'de Ventes' : type === 'financial' ? 'Financier' : 'Interventions'}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; }
              .logo { width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 10px; }
              .section { margin-bottom: 20px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .table th { background-color: #f5f5f5; }
              .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
              .kpi { display: inline-block; margin: 10px; padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center; }
              .kpi-value { font-size: 24px; font-weight: bold; color: #1e40af; }
              .kpi-label { font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="/parrabellum.jpg" alt="Parabellum Groups" class="logo" />
              <h1>PARABELLUM GROUPS</h1>
              <h2>RAPPORT ${type.toUpperCase()}</h2>
              <p>Période: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}</p>
            </div>
            <div class="summary">
              <h3>Résumé Exécutif</h3>
              <p>Rapport généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportReport = (reportData: any, type: string) => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Type,Valeur,Date\n" +
      (reportData?.data || []).map((row: any) => 
        `${row.name || row.type},${row.value || row.amount},${row.date || new Date().toISOString()}`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rapports et Analyses</h1>
          <p className="text-gray-600 dark:text-gray-300">Analysez les performances de votre entreprise</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-gray-500 dark:text-gray-400">à</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Sélecteur de type de rapport */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="sales">Rapport de Ventes</option>
            <option value="financial">Rapport Financier</option>
            <option value="interventions">Rapport Interventions</option>
            <option value="hr">Rapport RH</option>
            <option value="stock">Rapport Stock</option>
          </select>
        </div>
      </div>

      {/* Grille des rapports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Rapport de ventes */}
        {hasPermission('reports.sales') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
                Rapport de Ventes
              </h3>
            </div>
            <div className="p-6">
              {salesLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {salesReport?.data?.totalSales || 0}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Ventes totales</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF',
                          notation: 'compact'
                        }).format(salesReport?.data?.totalRevenue || 0)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Chiffre d'affaires</div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handlePrintReport(salesReport, 'sales')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Imprimer</span>
                    </button>
                    <button 
                      onClick={() => handleExportReport(salesReport, 'sales')}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
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
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                Rapport Financier
              </h3>
            </div>
            <div className="p-6">
              {financialLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF',
                          notation: 'compact'
                        }).format(financialReport?.data?.revenue || 0)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Revenus</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'XOF',
                          notation: 'compact'
                        }).format(financialReport?.data?.expenses || 0)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Dépenses</div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handlePrintReport(financialReport, 'financial')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Imprimer</span>
                    </button>
                    <button 
                      onClick={() => handleExportReport(financialReport, 'financial')}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <Download className="h-4 w-4" />
                      <span>Exporter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rapport interventions */}
        {hasPermission('interventions.read') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Activity className="h-5 w-5 text-purple-500 mr-2" />
                Rapport Interventions
              </h3>
            </div>
            <div className="p-6">
              {interventionLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {interventionReport?.data?.totalInterventions || 0}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {interventionReport?.data?.completedInterventions || 0}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Terminées</div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handlePrintReport(interventionReport, 'interventions')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Imprimer</span>
                    </button>
                    <button 
                      onClick={() => handleExportReport(interventionReport, 'interventions')}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
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

      {/* Graphiques détaillés */}
      {reportType === 'sales' && salesReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Évolution des Ventes</h3>
            <SalesChart data={salesReport.data?.monthlyData || []} type="line" />
          </div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Ventes par Produit</h3>
            <SalesChart data={salesReport.data?.byProduct || []} type="pie" />
          </div>
        </div>
      )}

      {/* Tableau détaillé */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Données Détaillées</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Élément
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Évolution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Données simulées - à remplacer par les vraies données */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Chiffre d'affaires
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(5000000)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                  +12.5%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};