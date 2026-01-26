'use client';

import React, { useState } from 'react';
import { usePayslips, useDeletePayslip } from '@/hooks/usePayslips';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PayslipPrint from '@/components/PrintComponents/PayslipPrint';
import { Plus, Printer, Edit, Trash2, Search, FileText } from 'lucide-react';

const statusLabels: Record<string, string> = {
  GENERATED: 'Généré',
  VALIDATED: 'Validé',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
};

export default function PayrollPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  const { data, isLoading, error } = usePayslips({ pageSize: 100, search: searchTerm });
  const deleteMutation = useDeletePayslip();

  const handlePrint = (payslip: any) => {
    const printData = {
      id: payslip.id,
      employee: {
        firstName: payslip.employee?.firstName || '',
        lastName: payslip.employee?.lastName || '',
        matricule: payslip.employee?.matricule || '',
        cnpsNumber: payslip.employee?.cnpsNumber || payslip.employee?.cnps_number || '',
        cnamNumber: payslip.employee?.cnamNumber || payslip.employee?.cnam_number || '',
        position: payslip.employee?.position || '',
      },
      period: payslip.period,
      baseSalary: payslip.baseSalary || payslip.base_salary,
      overtime: payslip.overtime || 0,
      bonuses: payslip.bonuses || 0,
      allowances: payslip.allowances || 0,
      deductions: payslip.deductions ? (typeof payslip.deductions === 'string' ? JSON.parse(payslip.deductions) : payslip.deductions) : [],
      netSalary: payslip.netSalary || payslip.net_salary,
      createdAt: payslip.createdAt || payslip.created_at || new Date().toISOString(),
    };

    setSelectedPayslip(printData);
    setShowPrint(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bulletin de paie ?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatPeriod = (period: string) => {
    const date = new Date(period);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    });
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
            Erreur lors du chargement des bulletins: {error.message}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulletins de Paie</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Générer bulletin
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouveau bulletin
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher un bulletin..."
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
                    Période
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Salaire Brut
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Retenues
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Net à Payer
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
                {data?.data?.data?.map((payslip: any) => (
                  <tr
                    key={payslip.id}
                    className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {payslip.employee?.firstName} {payslip.employee?.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {payslip.employee?.matricule}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {formatPeriod(payslip.period)}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {formatCurrency(payslip.grossSalary || payslip.gross_salary)}
                    </td>
                    <td className="py-3 px-4 text-red-600">
                      -{formatCurrency(payslip.totalDeductions || payslip.total_deductions || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-green-700">
                        {formatCurrency(payslip.netSalary || payslip.net_salary)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payslip.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : payslip.status === 'VALIDATED'
                            ? 'bg-blue-100 text-blue-800'
                            : payslip.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {statusLabels[payslip.status] || payslip.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrint(payslip)}
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
                          onClick={() => handleDelete(payslip.id)}
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
              <div className="text-center py-8 text-gray-500">Aucun bulletin trouvé</div>
            )}
          </div>
        )}

        {data?.data && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Total: {data.data.total} bulletin(s)
          </div>
        )}
      </Card>

      {showPrint && selectedPayslip && (
        <PayslipPrint
          salary={selectedPayslip}
          onClose={() => {
            setShowPrint(false);
            setSelectedPayslip(null);
          }}
        />
      )}
    </div>
  );
}
