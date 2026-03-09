'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Plus, Search, Calendar, Receipt } from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  supplier: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  paymentMethod: string;
  employee: string;
}

export default function DepensesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      return [
        { id: '1', date: '2026-01-20', category: 'Matériel', description: 'Achat outils spécialisés', supplier: 'TechnoSupply', amount: 8500, status: 'paid', paymentMethod: 'Virement', employee: 'Jean Dupont' },
        { id: '2', date: '2026-01-19', category: 'Déplacements', description: 'Mission client Paris', supplier: 'SNCF', amount: 350, status: 'approved', paymentMethod: 'Carte', employee: 'Marie Martin' },
        { id: '3', date: '2026-01-18', category: 'Formation', description: 'Formation sécurité incendie', supplier: 'FormaPro', amount: 1200, status: 'pending', paymentMethod: 'Virement', employee: 'Pierre Durant' },
        { id: '4', date: '2026-01-15', category: 'Loyer', description: 'Loyer bureaux janvier', supplier: 'ImmoCorp', amount: 4200, status: 'paid', paymentMethod: 'Prélèvement', employee: 'Admin' },
        { id: '5', date: '2026-01-12', category: 'Fournitures', description: 'Fournitures bureau', supplier: 'Bureau+', amount: 580, status: 'paid', paymentMethod: 'Carte', employee: 'Admin' },
      ];
    },
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      approved: { label: 'Approuvée', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      paid: { label: 'Payée', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    };
    const badge = badges[status] || badges.pending;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredExpenses = expenses?.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Dépenses</h1>
          <p className="text-muted-foreground mt-2">
            Suivi et validation des dépenses de l'entreprise
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Dépense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Dépenses</p>
              <p className="text-2xl font-bold">
                {expenses?.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}F
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En Attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {expenses?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}F
              </p>
            </div>
            <Receipt className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approuvées</p>
              <p className="text-2xl font-bold text-blue-600">
                {expenses?.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}F
              </p>
            </div>
            <Receipt className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Payées</p>
              <p className="text-2xl font-bold text-green-600">
                {expenses?.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}F
              </p>
            </div>
            <Receipt className="h-8 w-8 text-green-500" />
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
              placeholder="Rechercher une dépense..."
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvée</option>
            <option value="paid">Payée</option>
          </select>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Catégorie</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Fournisseur</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Montant</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Paiement</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Employé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses?.map((expense) => (
                  <tr key={expense.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm">{new Date(expense.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">{expense.description}</td>
                    <td className="py-3 px-4 text-sm">{expense.supplier}</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">
                      {expense.amount.toLocaleString()}F
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(expense.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{expense.paymentMethod}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{expense.employee}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Détails</Button>
                        {expense.status === 'pending' && (
                          <Button size="sm" className="bg-green-600 text-white">Approuver</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
