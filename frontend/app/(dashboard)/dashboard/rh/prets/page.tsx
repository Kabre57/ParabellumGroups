'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Search, Calendar } from 'lucide-react';
import { apiClient } from '@/shared/api/shared/client';

interface Loan {
  id: string;
  employee: string;
  type: 'advance' | 'loan';
  amount: number;
  remainingAmount: number;
  monthlyDeduction: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'pending';
  reason: string;
}

export default function PretsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => {
      const res = await apiClient.get('/hr/loans');
      return res.data?.data || res.data || [];
    },
  });

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      loan: { label: 'Prêt', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      advance: { label: 'Avance', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    };
    const badge = badges[type] || badges.loan;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: { label: 'En cours', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      completed: { label: 'Remboursé', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    };
    const badge = badges[status] || badges.pending;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredLoans = loans?.filter(loan => {
    const matchesSearch = loan.employee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || loan.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Avances & Prêts</h1>
          <p className="text-muted-foreground mt-2">
            Gestion des avances sur salaire et prêts aux employés
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Demande
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Prêtés</p>
              <p className="text-2xl font-bold">
                {loans?.reduce((sum, l) => sum + l.amount, 0).toLocaleString()}F
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En Cours</p>
              <p className="text-2xl font-bold text-orange-600">
                {loans?.reduce((sum, l) => sum + l.remainingAmount, 0).toLocaleString()}F
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Prêts Actifs</p>
              <p className="text-2xl font-bold text-green-600">
                {loans?.filter(l => l.status === 'active').length || 0}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Déduction Mensuelle</p>
              <p className="text-2xl font-bold text-purple-600">
                {loans?.filter(l => l.status === 'active').reduce((sum, l) => sum + l.monthlyDeduction, 0).toLocaleString()}F
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-500" />
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Tous les types</option>
            <option value="loan">Prêt</option>
            <option value="advance">Avance</option>
          </select>
        </div>
      </Card>

      {/* Loans Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Employé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Motif</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Montant Initial</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Restant Dû</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Déduction/Mois</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Début</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Fin</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans?.map((loan) => {
                  const progress = ((loan.amount - loan.remainingAmount) / loan.amount) * 100;
                  
                  return (
                    <tr key={loan.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-medium">{loan.employee}</td>
                      <td className="py-3 px-4">{getTypeBadge(loan.type)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{loan.reason}</td>
                      <td className="py-3 px-4 text-right font-semibold">{loan.amount.toLocaleString()}F</td>
                      <td className="py-3 px-4 text-right">
                        <div>
                          <div className="font-semibold text-orange-600">{loan.remainingAmount.toLocaleString()}F</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-green-600 h-1.5 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-red-600">-{loan.monthlyDeduction.toLocaleString()}F</td>
                      <td className="py-3 px-4 text-sm">{new Date(loan.startDate).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 px-4 text-sm">{new Date(loan.endDate).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 px-4">{getStatusBadge(loan.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Détails</Button>
                          {loan.status === 'pending' && (
                            <Button size="sm" className="bg-green-600 text-white">Approuver</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
