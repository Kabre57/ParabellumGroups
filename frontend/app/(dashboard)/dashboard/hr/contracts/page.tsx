'use client';

import React, { useState } from 'react';
import { useContracts, useDeleteContract } from '@/hooks/useContracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ContractPrint from '@/components/PrintComponents/ContractPrint';
import { Plus, Printer, Edit, Trash2, Search } from 'lucide-react';

const contractTypeLabels: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  FREELANCE: 'Freelance',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Actif',
  TERMINATED: 'Terminé',
  SUSPENDED: 'Suspendu',
};

export default function ContractsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  const { data, isLoading, error } = useContracts({ pageSize: 100, search: searchTerm });
  const deleteMutation = useDeleteContract();

  const handlePrint = (contract: any) => {
    const printData = {
      id: contract.id,
      type: contract.contractType || contract.contract_type,
      employee: {
        firstName: contract.employee?.firstName || '',
        lastName: contract.employee?.lastName || '',
        email: contract.employee?.email || '',
        phone: contract.employee?.phoneNumber || contract.employee?.phone_number || '',
        address: contract.employee?.address || '',
        position: contract.position,
      },
      startDate: contract.startDate || contract.start_date,
      endDate: contract.endDate || contract.end_date,
      salary: contract.salary,
      workingHours: `${contract.workHoursPerWeek || contract.work_hours_per_week || 40} heures par semaine`,
      benefits: contract.benefits,
      clauses: contract.clauses,
      createdAt: contract.createdAt || contract.created_at || new Date().toISOString(),
    };

    setSelectedContract(printData);
    setShowPrint(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-red-600">
            Erreur lors du chargement des contrats: {error.message}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contrats</h1>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouveau contrat
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher un contrat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Employé
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Poste
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Salaire
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Début
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Statut
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.data?.map((contract: any) => (
                  <tr
                    key={contract.id}
                    className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {contract.employee?.firstName} {contract.employee?.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {contract.employee?.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {contractTypeLabels[contract.contractType || contract.contract_type]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {contract.position}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {formatCurrency(contract.salary)}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {formatDate(contract.startDate || contract.start_date)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : contract.status === 'TERMINATED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {statusLabels[contract.status] || contract.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrint(contract)}
                          className="flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Imprimer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(contract.id)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.data?.data?.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucun contrat trouvé</div>
            )}
          </div>
        )}

        {data?.data && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Total: {data.data.total} contrat(s)
          </div>
        )}
      </Card>

      {showPrint && selectedContract && (
        <ContractPrint
          contract={selectedContract}
          onClose={() => {
            setShowPrint(false);
            setSelectedContract(null);
          }}
        />
      )}
    </div>
  );
}
