import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, User, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateEmployeeModal } from '../../components/Modals/Create/CreateEmployeeModal';
import { EditEmployeeModal } from '../../components/Modals/Edit/EditEmployeeModal';
import { ViewEmployeeModal } from '../../components/Modals/View/ViewEmployeeModal';

const employeeService = createCrudService('employees');

export const EmployeeList: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', page, search, serviceFilter],
    queryFn: () => employeeService.getAll({ page, limit: 10, search, serviceId: serviceFilter })
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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
        Erreur lors du chargement des employés
      </div>
    );
  }

  const employees = data?.data?.employees || [];
  const pagination = data?.data?.pagination;

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedEmployee(null);
  };

  const handleDeleteEmployee = async (employee: any) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'employé ${employee.firstName} ${employee.lastName} ?`)) {
      try {
        await deleteEmployeeMutation.mutateAsync(employee.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Employés</h1>
          <p className="text-gray-600">Gérez les informations des employés et leurs contrats</p>
        </div>
        {hasPermission('employees.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvel Employé</span>
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
              placeholder="Rechercher un employé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les services</option>
            <option value="1">Service Commercial</option>
            <option value="2">Service Progitek</option>
            <option value="3">Service Comptabilité</option>
          </select>
        </div>
      </div>

      {/* Modales */}
      <CreateEmployeeModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <EditEmployeeModal
        isOpen={showEditModal}
        onClose={handleCloseModals}
        employee={selectedEmployee}
      />
      
      <ViewEmployeeModal
        isOpen={showViewModal}
        onClose={handleCloseModals}
        employee={selectedEmployee}
      />

      {/* Liste des employés */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employé
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Poste
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date d'embauche
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
            {employees.map((employee: any) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.employeeNumber}
                      </div>
                      {employee.email && (
                        <div className="text-sm text-gray-500">
                          {employee.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{employee.position}</div>
                  {employee.department && (
                    <div className="text-sm text-gray-500">{employee.department}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee.service?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(employee.hireDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    employee.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {hasPermission('employees.read') && (
                      <button 
                        onClick={() => handleViewEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('contracts.read') && (
                      <button className="text-purple-600 hover:text-purple-900" title="Contrats">
                        <Calendar className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('salaries.read') && (
                      <button className="text-green-600 hover:text-green-900" title="Salaires">
                        <DollarSign className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('employees.update') && (
                      <button 
                        onClick={() => handleEditEmployee(employee)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('employees.delete') && (
                      <button 
                        onClick={() => handleDeleteEmployee(employee)}
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
    </div>
  );
};