import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, FileText, Calendar, DollarSign, Printer, User, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateContractModal } from '../../components/Modals/Create/CreateContractModal';
import { EditContractModal } from '../../components/Modals/Edit/EditContractModal';
import { ViewContractModal } from '../../components/Modals/View/ViewContractModal';
import { ContractPrint } from '../../components/PrintComponents/ContractPrint';

const contractService = createCrudService('contracts');

const contractTypeLabels = {
  CDI: 'CDI - Contrat à Durée Indéterminée',
  CDD: 'CDD - Contrat à Durée Déterminée',
  STAGE: 'Stage',
  FREELANCE: 'Freelance'
};

export const ContractList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['contracts', page, search, typeFilter, statusFilter],
    queryFn: () => contractService.getAll({ 
      page, 
      limit: 10, 
      search, 
      contractType: typeFilter,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined
    })
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: number) => contractService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }
  });

  const terminateContractMutation = useMutation({
    mutationFn: ({ id, endDate, reason }: { id: number; endDate: string; reason: string }) =>
      fetch(`/api/v1/contracts/${id}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ endDate, reason })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
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
        Erreur lors du chargement des contrats
      </div>
    );
  }

  const contracts = data?.data?.contracts || [];

  const handleViewContract = (contract: any) => {
    setSelectedContract(contract);
    setShowViewModal(true);
  };

  const handleEditContract = (contract: any) => {
    setSelectedContract(contract);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedContract(null);
  };
  const pagination = data?.data?.pagination;

  const handleDeleteContract = async (contract: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le contrat de ${contract.employee.firstName} ${contract.employee.lastName} ?`)) {
      try {
        await deleteContractMutation.mutateAsync(contract.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleTerminateContract = async (contract: any) => {
    const endDate = prompt('Date de fin du contrat (YYYY-MM-DD):');
    const reason = prompt('Motif de résiliation:');
    
    if (endDate && reason) {
      try {
        await terminateContractMutation.mutateAsync({ 
          id: contract.id, 
          endDate, 
          reason 
        });
      } catch (error) {
        console.error('Erreur lors de la résiliation:', error);
      }
    }
  };

  const handlePrintContract = (contract: any) => {
    setSelectedContract(contract);
    setShowPrintModal(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Contrats</h1>
          <p className="text-gray-600 dark:text-gray-300">Gérez les contrats de travail des employés</p>
        </div>
        {hasPermission('contracts.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Contrat</span>
          </button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Contrats</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {contracts.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CDI</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {contracts.filter((c: any) => c.contractType === 'CDI').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CDD</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {contracts.filter((c: any) => c.contractType === 'CDD').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Masse Salariale</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  notation: 'compact'
                }).format(contracts.reduce((sum: number, c: any) => sum + c.baseSalary, 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un contrat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Tous les types</option>
            {Object.entries(contractTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
      </div>

      {/* Liste des contrats */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Employé
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type de contrat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Période
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Salaire de base
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Heures/semaine
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {contracts.map((contract: any) => (
              <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {contract.employee.firstName} {contract.employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {contract.employee.position} - {contract.employee.service?.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                    contract.contractType === 'CDI' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    contract.contractType === 'CDD' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    contract.contractType === 'STAGE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  }`}>
                    {contract.contractType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  <div>
                    <div>Début: {new Date(contract.startDate).toLocaleDateString()}</div>
                    {contract.endDate && (
                      <div>Fin: {new Date(contract.endDate).toLocaleDateString()}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(contract.baseSalary)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {contract.workingHours}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    contract.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {contract.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {hasPermission('contracts.read') && (
                      <button 
                        onClick={() => handlePrintContract(contract)}
                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                        title="Imprimer contrat"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Voir détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {hasPermission('contracts.update') && (
                      <button 
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('contracts.update') && contract.isActive && (
                      <button 
                        onClick={() => handleTerminateContract(contract)}
                        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                        title="Résilier"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('contracts.delete') && !contract.isActive && (
                      <button 
                        onClick={() => handleDeleteContract(contract)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
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
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600'
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

      {/* Modales */}
      <CreateContractModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      {showPrintModal && selectedContract && (
        <ContractPrint 
          contract={selectedContract} 
          onClose={() => setShowPrintModal(false)} 
        />
      )}
    </div>
  );
};