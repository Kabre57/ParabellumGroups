'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Download,
  Building2,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/Progress';
import billingService from '@/shared/api/billing';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

export default function BudgetPerformancePage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['billing-budget-performance', selectedYear],
    queryFn: () => billingService.getBudgetPerformance(selectedYear),
  });

  const performance = budgetData?.data || [];
  const summary = budgetData?.summary || { totalAllocated: 0, totalSpent: 0, globalPerformance: 0 };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Budgétaire</h1>
          <p className="mt-2 text-muted-foreground italic">
            Suivi en temps réel de la consommation budgétaire par centre de responsabilité et filiale.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 border-indigo-100 bg-white">
            <Calendar className="mr-2 h-4 w-4 text-indigo-500" />
            Exercice {selectedYear}
          </Button>
          <Button className="h-10 bg-indigo-600 hover:bg-indigo-700">
            <Download className="mr-2 h-4 w-4" />
            Exporter Rapport
          </Button>
        </div>
      </div>

      {/* Cartes de synthèse budgétaire */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden p-6 border-none shadow-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <Wallet className="absolute -bottom-2 -right-2 h-20 w-20 opacity-10" />
          <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Total Alloué</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(summary.totalAllocated)}</p>
          <div className="mt-4 flex items-center text-xs opacity-90">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Fixé selon l&apos;exercice {selectedYear}
          </div>
        </Card>

        <Card className="relative overflow-hidden p-6 border-none shadow-md bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Consommé</p>
              <p className="text-3xl font-bold mt-1 text-gray-900">{formatCurrency(summary.totalSpent)}</p>
            </div>
            <div className={`p-2 rounded-full ${summary.globalPerformance > 90 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
              {summary.globalPerformance > 90 ? <ArrowUpRight className="h-5 w-5 text-rose-500" /> : <ArrowDownRight className="h-5 w-5 text-emerald-500" />}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">Consommation Globale</span>
              <span className="font-bold">{summary.globalPerformance.toFixed(1)}%</span>
            </div>
            <Progress value={summary.globalPerformance} className="h-2 bg-gray-100" />
          </div>
        </Card>

        <Card className="relative overflow-hidden p-6 border-none shadow-md bg-white">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Centres Actifs</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{performance.length}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {summary.globalPerformance > 100 ? (
              <Badge variant="destructive" className="flex items-center">
                <AlertTriangle className="mr-1 h-3 w-3" /> Budget Dépassé
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Maîtrise saine
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Graphique de comparaison par centre */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
        <Card className="p-6 shadow-sm border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-bold">Analyse Comparative par Centre de Responsabilité</h3>
            <p className="text-sm text-gray-400">Répartition du budget alloué vs dépenses réelles.</p>
          </div>
          <div className="h-[400px] w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center font-medium italic text-gray-400">
                Traitement des données analytiques...
              </div>
            ) : performance.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                Aucune donnée budgétaire pour cet exercice.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="centerName" fontSize={11} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={11} tick={{ fill: '#6b7280' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(val: number) => [formatCurrency(val), ""]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar 
                    name="Budget Alloué" 
                    dataKey="allocated" 
                    fill="#e0e7ff" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  />
                  <Bar 
                    name="Dépenses Réelles" 
                    dataKey="spent" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  >
                    {performance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.performance > 100 ? '#ef4444' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Tableau détaillé des centres */}
      <Card className="shadow-sm border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
          <h3 className="font-bold flex items-center">
            <Building2 className="mr-2 h-4 w-4 text-gray-400" /> Détail par Centre Analytique
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="px-6 py-4">Centre de Responsabilité</th>
                <th className="px-6 py-4 text-right">Budget Alloué</th>
                <th className="px-6 py-4 text-right">Consommé (Réel)</th>
                <th className="px-6 py-4 text-right">Reliquat</th>
                <th className="px-6 py-4 text-center">Taux Consommation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {performance.map((stat, i) => (
                <tr key={stat.centerName} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-700">{stat.centerName}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(stat.allocated)}</td>
                  <td className="px-6 py-4 text-right tabular-nums font-semibold text-indigo-600">{formatCurrency(stat.spent)}</td>
                  <td className={`px-6 py-4 text-right tabular-nums ${stat.remaining < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                    {formatCurrency(stat.remaining)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-24">
                        <Progress value={Math.min(stat.performance, 100)} className={`h-1.5 ${stat.performance > 100 ? 'bg-rose-100' : 'bg-indigo-100'}`} />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${stat.performance > 100 ? 'text-rose-600' : 'text-gray-600'}`}>
                        {stat.performance.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
