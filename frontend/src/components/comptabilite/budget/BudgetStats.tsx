'use client';
import { CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/Progress';

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(v || 0).replace('XOF', 'F CFA');

interface BudgetSummary { totalAllocated: number; totalSpent: number; globalPerformance: number; }

export function BudgetStats({ summary, count }: { summary: BudgetSummary; count: number }) {
  const over = summary.globalPerformance > 100;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="relative overflow-hidden p-6 border-none shadow-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
        <Wallet className="absolute -bottom-2 -right-2 h-20 w-20 opacity-10" />
        <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Total Alloué</p>
        <p className="text-3xl font-bold mt-1">{fmt(summary.totalAllocated)}</p>
        <div className="mt-4 flex items-center text-xs opacity-90">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Budget de l&apos;exercice courant
        </div>
      </Card>

      <Card className="relative overflow-hidden p-6 border-none shadow-md bg-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Consommé</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{fmt(summary.totalSpent)}</p>
          </div>
          <div className={`p-2 rounded-full ${summary.globalPerformance > 90 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
            {summary.globalPerformance > 90
              ? <ArrowUpRight className="h-5 w-5 text-rose-500" />
              : <ArrowDownRight className="h-5 w-5 text-emerald-500" />}
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
        <p className="text-3xl font-bold mt-1 text-gray-900">{count}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {over
            ? <Badge variant="destructive" className="flex items-center"><AlertTriangle className="mr-1 h-3 w-3" />Budget Dépassé</Badge>
            : <Badge className="bg-emerald-100 text-emerald-700 border-none"><CheckCircle2 className="mr-1 h-3 w-3" />Maîtrise saine</Badge>}
        </div>
      </Card>
    </div>
  );
}
