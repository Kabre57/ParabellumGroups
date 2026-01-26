'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Search, Edit } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  label: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  lastTransaction: string;
}

export default function ComptesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      return [
        { id: '1', code: '512', label: 'Banque Centrale', type: 'asset', balance: 245000, lastTransaction: '2026-01-20' },
        { id: '2', code: '411', label: 'Clients', type: 'asset', balance: 87000, lastTransaction: '2026-01-19' },
        { id: '3', code: '401', label: 'Fournisseurs', type: 'liability', balance: -42000, lastTransaction: '2026-01-18' },
        { id: '4', code: '421', label: 'Salaires à payer', type: 'liability', balance: -85000, lastTransaction: '2026-01-19' },
        { id: '5', code: '706', label: 'Prestations de services', type: 'revenue', balance: 320000, lastTransaction: '2026-01-20' },
        { id: '6', code: '641', label: 'Rémunérations du personnel', type: 'expense', balance: -180000, lastTransaction: '2026-01-19' },
        { id: '7', code: '607', label: 'Achats de marchandises', type: 'expense', balance: -45000, lastTransaction: '2026-01-15' },
        { id: '8', code: '613', label: 'Locations', type: 'expense', balance: -12600, lastTransaction: '2026-01-12' },
      ];
    },
  });

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      asset: { label: 'Actif', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      liability: { label: 'Passif', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      equity: { label: 'Capital', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      revenue: { label: 'Produits', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      expense: { label: 'Charges', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
    };
    const badge = badges[type] || badges.asset;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredAccounts = accounts?.filter(account => {
    const matchesSearch = account.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         account.code.includes(searchQuery);
    const matchesType = typeFilter === 'all' || account.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Plan Comptable</h1>
          <p className="text-muted-foreground mt-2">
            Gestion du plan comptable et comptes généraux
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau Compte
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Comptes</p>
              <p className="text-2xl font-bold">{accounts?.length || 0}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Actifs</p>
              <p className="text-2xl font-bold text-blue-600">
                {accounts?.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0).toLocaleString()}F
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Passifs</p>
              <p className="text-2xl font-bold text-red-600">
                {Math.abs(accounts?.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0) || 0).toLocaleString()}F
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Résultat Net</p>
              <p className="text-2xl font-bold text-green-600">
                {((accounts?.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0) || 0) +
                 (accounts?.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0) || 0)).toLocaleString()}F
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un compte..."
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Tous les types</option>
            <option value="asset">Actif</option>
            <option value="liability">Passif</option>
            <option value="equity">Capital</option>
            <option value="revenue">Produits</option>
            <option value="expense">Charges</option>
          </select>
        </div>
      </Card>

      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Libellé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Solde</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Dernière Transaction</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts?.map((account) => (
                  <tr key={account.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                        {account.code}
                      </code>
                    </td>
                    <td className="py-3 px-4 font-medium">{account.label}</td>
                    <td className="py-3 px-4">{getTypeBadge(account.type)}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {account.balance.toLocaleString()}F
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(account.lastTransaction).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Détails</Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
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
