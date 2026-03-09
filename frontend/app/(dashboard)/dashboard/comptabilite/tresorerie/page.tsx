'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Calendar } from 'lucide-react';

interface CashFlow {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
}

export default function TresoreriePage() {
  const [period, setPeriod] = useState('month');

  const { data: cashFlows, isLoading } = useQuery<CashFlow[]>({
    queryKey: ['cash-flows', period],
    queryFn: async () => {
      return [
        { id: '1', date: '2026-01-20', type: 'income', category: 'Facturation', description: 'Paiement Entreprise ABC', amount: 45000, balance: 245000 },
        { id: '2', date: '2026-01-19', type: 'expense', category: 'Salaires', description: 'Paie janvier 2026', amount: -85000, balance: 200000 },
        { id: '3', date: '2026-01-18', type: 'income', category: 'Facturation', description: 'Paiement Société XYZ', amount: 12000, balance: 285000 },
        { id: '4', date: '2026-01-15', type: 'expense', category: 'Achats', description: 'Matériel technique', amount: -8500, balance: 273000 },
        { id: '5', date: '2026-01-12', type: 'expense', category: 'Charges', description: 'Loyer bureaux', amount: -4200, balance: 281500 },
      ];
    },
  });

  const totalIncome = cashFlows?.filter(cf => cf.type === 'income').reduce((sum, cf) => sum + cf.amount, 0) || 0;
  const totalExpense = Math.abs(cashFlows?.filter(cf => cf.type === 'expense').reduce((sum, cf) => sum + cf.amount, 0) || 0);
  const currentBalance = cashFlows?.[0]?.balance || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trésorerie</h1>
          <p className="text-muted-foreground mt-2">
            Suivi des flux de trésorerie et solde bancaire
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Personnalisé
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Solde Actuel</p>
              <p className="text-2xl font-bold">{currentBalance.toLocaleString()}F</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Encaissements</p>
              <p className="text-2xl font-bold text-green-600">+{totalIncome.toLocaleString()}F</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Décaissements</p>
              <p className="text-2xl font-bold text-red-600">-{totalExpense.toLocaleString()}F</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Solde Net</p>
              <p className="text-2xl font-bold">{(totalIncome - totalExpense).toLocaleString()}F</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Cash Flow Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Mouvements de Trésorerie</h2>
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Catégorie</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Montant</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Solde</th>
                </tr>
              </thead>
              <tbody>
                {cashFlows?.map((flow) => (
                  <tr key={flow.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm">{new Date(flow.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4">
                      {flow.type === 'income' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          Encaissement
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <TrendingDown className="h-4 w-4" />
                          Décaissement
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">{flow.category}</td>
                    <td className="py-3 px-4 text-sm">{flow.description}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${flow.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {flow.amount > 0 ? '+' : ''}{flow.amount.toLocaleString()}F
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{flow.balance.toLocaleString()}F</td>
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
