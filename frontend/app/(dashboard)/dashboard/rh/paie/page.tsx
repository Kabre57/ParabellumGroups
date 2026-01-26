'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Search, Download, CheckCircle, Clock } from 'lucide-react';

interface Payroll {
  id: string;
  employee: string;
  period: string;
  grossSalary: number;
  netSalary: number;
  socialCharges: number;
  tax: number;
  bonus: number;
  deductions: number;
  status: 'draft' | 'validated' | 'paid';
  paymentDate?: string;
}

export default function PaiePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('2026-01');

  const { data: payrolls, isLoading } = useQuery<Payroll[]>({
    queryKey: ['payrolls', periodFilter],
    queryFn: async () => {
      return [
        { id: '1', employee: 'Jean Dupont', period: '2026-01', grossSalary: 3500, netSalary: 2625, socialCharges: 700, tax: 175, bonus: 0, deductions: 0, status: 'paid', paymentDate: '2026-01-31' },
        { id: '2', employee: 'Marie Martin', period: '2026-01', grossSalary: 3200, netSalary: 2400, socialCharges: 640, tax: 160, bonus: 200, deductions: 0, status: 'paid', paymentDate: '2026-01-31' },
        { id: '3', employee: 'Pierre Durant', period: '2026-01', grossSalary: 2800, netSalary: 2100, socialCharges: 560, tax: 140, bonus: 0, deductions: 0, status: 'validated' },
        { id: '4', employee: 'Sophie Lambert', period: '2026-01', grossSalary: 1200, netSalary: 1050, socialCharges: 120, tax: 30, bonus: 0, deductions: 0, status: 'validated' },
        { id: '5', employee: 'Lucas Bernard', period: '2026-01', grossSalary: 600, netSalary: 570, socialCharges: 30, tax: 0, bonus: 0, deductions: 0, status: 'draft' },
      ];
    },
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      validated: { label: 'Validée', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      paid: { label: 'Payée', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    };
    const badge = badges[status] || badges.draft;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredPayrolls = payrolls?.filter(payroll =>
    payroll.employee.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                {payrolls?.reduce((sum, p) => sum + p.grossSalary, 0).toLocaleString()}F
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
                {payrolls?.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}F
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
                {payrolls?.reduce((sum, p) => sum + p.socialCharges, 0).toLocaleString()}F
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
                {payrolls?.filter(p => p.status === 'paid').length || 0}/{payrolls?.length || 0}
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
          <div className="text-center py-8">Chargement...</div>
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
                {filteredPayrolls?.map((payroll) => (
                  <tr key={payroll.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium">{payroll.employee}</td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(payroll.period + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">{payroll.grossSalary.toLocaleString()}F</td>
                    <td className="py-3 px-4 text-right text-red-600">-{payroll.socialCharges.toLocaleString()}F</td>
                    <td className="py-3 px-4 text-right text-red-600">-{payroll.tax.toLocaleString()}F</td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {payroll.bonus > 0 ? `+${payroll.bonus.toLocaleString()}F` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">{payroll.netSalary.toLocaleString()}F</td>
                    <td className="py-3 px-4">{getStatusBadge(payroll.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                        {payroll.status === 'draft' && (
                          <Button size="sm" className="bg-blue-600 text-white">
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                  <td colSpan={2} className="py-3 px-4">TOTAUX</td>
                  <td className="py-3 px-4 text-right">
                    {payrolls?.reduce((sum, p) => sum + p.grossSalary, 0).toLocaleString()}F
                  </td>
                  <td className="py-3 px-4 text-right text-red-600">
                    -{payrolls?.reduce((sum, p) => sum + p.socialCharges, 0).toLocaleString()}F
                  </td>
                  <td className="py-3 px-4 text-right text-red-600">
                    -{payrolls?.reduce((sum, p) => sum + p.tax, 0).toLocaleString()}F
                  </td>
                  <td className="py-3 px-4 text-right text-green-600">
                    +{payrolls?.reduce((sum, p) => sum + p.bonus, 0).toLocaleString()}F
                  </td>
                  <td className="py-3 px-4 text-right text-blue-600">
                    {payrolls?.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}F
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
