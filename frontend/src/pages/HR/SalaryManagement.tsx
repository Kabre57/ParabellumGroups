import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Edit, Trash2, DollarSign, Printer, Download, CheckCircle, Clock, User, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateSalaryModal } from '../../components/Modals/Create/CreateSalaryModal';
import { PaySalaryModal } from '../../components/Modals/PaySalaryModal';
import { PayslipPrint } from '../../components/PrintComponents/PayslipPrint';

const salaryService = createCrudService('salaries');

const statusConfig = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PAID: { label: 'Payé', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

export const SalaryManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const [showPayslip, setShowPayslip] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['salaries', page, search, statusFilter, yearFilter, monthFilter],
    queryFn: () => salaryService.getAll({ 
      page, 
      limit: 10, 
      search, 
      status: statusFilter,
      year: yearFilter,
      month: monthFilter
    })
  });

  const paySalaryMutation = useMutation({
    mutationFn: ({ id, paymentData }: { id: number; paymentData: any }) => 
      fetch(`/api/v1/salaries/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      setShowPayModal(false);
    }
  });

  const deleteSalaryMutation = useMutation({
    mutationFn: (id: number) => salaryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
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
        Erreur lors du chargement des salaires
      </div>
    );
  }

  const salaries = data?.data?.salaries || [];
  const pagination = data?.data?.pagination;

  const handlePaySalary = (salary: any) => {
    setSelectedSalary(salary);
    setShowPayModal(true);
  };

  const handlePrintPayslip = (salary: any) => {
    setSelectedSalary(salary);
    setShowPayslip(true);
  };

  const handleDeleteSalary = async (salary: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le salaire de ${salary.employee.firstName} ${salary.employee.lastName} ?`)) {
      try {
        await deleteSalaryMutation.mutateAsync(salary.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const months = [
    { value: '1', label: 'Janvier' },
    { value: '2', label: 'Février' },
    { value: '3', label: 'Mars' },
    { value: '4', label: 'Avril' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Juin' },
    { value: '7', label: 'Juillet' },
    { value: '8', label: 'Août' },
    { value: '9', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' }
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Salaires</h1>
          <p className="text-gray-600">Gérez les salaires et bulletins de paie</p>
        </div>
        {hasPermission('salaries.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Salaire</span>
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les mois</option>
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
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
      <CreateSalaryModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <PaySalaryModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        salary={selectedSalary}
        onPay={(paymentData) => paySalaryMutation.mutate({ id: selectedSalary.id, paymentData })}
      />

      {showPayslip && selectedSalary && (
        <PayslipPrint 
          salary={selectedSalary} 
          onClose={() => setShowPayslip(false)} 
        />
      )}

      {/* Liste des salaires */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employé
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Période
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salaire Brut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Déductions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salaire Net
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
            {salaries.map((salary: any) => {
              const statusInfo = statusConfig[salary.status as keyof typeof statusConfig] || statusConfig.PENDING;
              const StatusIcon = statusInfo.icon;
              
              return (
                <tr key={salary.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {salary.employee.firstName} {salary.employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {salary.employee.position} - {salary.employee.service?.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(salary.paymentDate).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format(salary.grossSalary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    -{new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format(salary.totalDeductions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format(salary.netSalary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('salaries.read') && (
                        <button 
                          onClick={() => handlePrintPayslip(salary)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Imprimer bulletin"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        className="text-green-600 hover:text-green-900"
                        title="Télécharger PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {hasPermission('salaries.update') && salary.status === 'PENDING' && (
                        <button 
                          onClick={() => handlePaySalary(salary)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Marquer comme payé"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('salaries.read') && (
                        <button className="text-indigo-600 hover:text-indigo-900" title="Voir détails">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('salaries.update') && (
                        <button className="text-yellow-600 hover:text-yellow-900" title="Modifier">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('salaries.delete') && salary.status === 'PENDING' && (
                        <button 
                          onClick={() => handleDeleteSalary(salary)}
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

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Brut</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact'
                }).format(salaries.reduce((sum: number, s: any) => sum + s.grossSalary, 0))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Déductions</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact'
                }).format(salaries.reduce((sum: number, s: any) => sum + s.totalDeductions, 0))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Net</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact'
                }).format(salaries.reduce((sum: number, s: any) => sum + s.netSalary, 0))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <User className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Employés</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Set(salaries.map((s: any) => s.employeeId)).size}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};