'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Search, Download, CheckCircle } from 'lucide-react';
import { hrService, Payroll } from '@/shared/api/hr';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

export default function PaiePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('2026-01');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['payrolls', periodFilter],
    queryFn: async () => {
      const [year, month] = periodFilter.split('-').map((v) => parseInt(v, 10));
      return hrService.getPayrolls({ year, month, pageSize: 50 });
    },
  });

  const payrolls = data?.data ?? [];

  const validateMutation = useMutation({
    mutationFn: (p: Payroll) => hrService.updatePayroll(p.id, { statut: 'VALIDE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Bulletin validé');
    },
    onError: () => toast.error('Validation impossible'),
  });

  const payMutation = useMutation({
    mutationFn: (p: Payroll) => hrService.updatePayroll(p.id, { statut: 'PAYE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Bulletin marqué payé');
    },
    onError: () => toast.error('Mise à jour impossible'),
  });

  const downloadMutation = useMutation({
    mutationFn: (p: Payroll) => hrService.downloadPayrollPdf(p.id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin-${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onError: () => toast.error('PDF indisponible'),
  });

  const getStatusBadge = (status: string | undefined) => {
    const s = (status || 'genere').toLowerCase();
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      genere: { label: 'Généré', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      valide: { label: 'Validée', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      paye: { label: 'Payée', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      validated: { label: 'Validée', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      paid: { label: 'Payée', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    };
    const badge = badges[s] || badges.genere;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredPayrolls = useMemo(
    () =>
      payrolls.filter((p: Payroll) =>
        `${p.employee?.firstName ?? ''} ${p.employee?.lastName ?? ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [payrolls, searchQuery]
  );

  const totalGross = payrolls.reduce((sum, p: Payroll) => sum + (p.grossSalary || 0), 0);
  const totalNet = payrolls.reduce((sum, p: Payroll) => sum + (p.netSalary || 0), 0);
  const totalCharges = payrolls.reduce((sum, p: Payroll) => sum + (p.socialContributions || p.deductions || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Paie & Salaires</h1>
          <p className="text-muted-foreground mt-2">
            Gestion de la paie et bulletins de salaire
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Générer Paie
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Salaires Bruts</p>
              <p className="text-2xl font-bold">
                {totalGross.toLocaleString()}F
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Salaires Nets</p>
              <p className="text-2xl font-bold text-green-600">
                {totalNet.toLocaleString()}F
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Charges Sociales</p>
              <p className="text-2xl font-bold text-orange-600">
                {totalCharges.toLocaleString()}F
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Payées</p>
              <p className="text-2xl font-bold text-green-600">
                {payrolls.filter((p: Payroll) => (p.status || '').startsWith('pay')).length}/{payrolls.length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un employé..."
              className="pl-10"
            />
          </div>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="2026-01">Janvier 2026</option>
            <option value="2025-12">Décembre 2025</option>
            <option value="2025-11">Novembre 2025</option>
          </select>
        </div>
      </Card>

      {/* Payrolls Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Employé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Période</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Salaire Brut</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Charges</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Impôts</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Prime</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Net à Payer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date Paiement</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls?.map((payroll: Payroll) => (
                  <tr key={payroll.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium">
                      {payroll.employee?.firstName ? `${payroll.employee.firstName} ${payroll.employee.lastName ?? ''}` : payroll.employeeId}
                      {payroll.employee?.matricule && (
                        <div className="text-xs text-gray-500">Matricule {payroll.employee.matricule}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(payroll.period + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">{(payroll.grossSalary || 0).toLocaleString()}F</td>
                    <td className="py-3 px-4 text-right text-red-600">-{(payroll.socialContributions || payroll.deductions || 0).toLocaleString()}F</td>
                    <td className="py-3 px-4 text-right text-red-600">-{(payroll.taxAmount || 0).toLocaleString()}F</td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {payroll.bonuses && payroll.bonuses > 0 ? `+${payroll.bonuses.toLocaleString()}F` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">{(payroll.netSalary || 0).toLocaleString()}F</td>
                    <td className="py-3 px-4">{getStatusBadge(payroll.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadMutation.mutate(payroll)}
                          disabled={downloadMutation.isPending}
                          title="Télécharger le PDF"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {(payroll.status === 'draft' || payroll.status === 'genere') && (
                          <Button
                            size="sm"
                            className="bg-blue-600 text-white"
                            onClick={() => validateMutation.mutate(payroll)}
                            disabled={validateMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                        {payroll.status && ['valide', 'validated', 'validee'].includes(payroll.status) && (
                          <Button
                            size="sm"
                            className="bg-green-600 text-white"
                            onClick={() => payMutation.mutate(payroll)}
                            disabled={payMutation.isPending}
                          >
                            Payer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayrolls?.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">
                      Aucun bulletin trouvé pour cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
