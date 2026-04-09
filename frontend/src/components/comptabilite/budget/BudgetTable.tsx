'use client';
import { Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/Progress';

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(v || 0).replace('XOF', 'F CFA');

interface BudgetTableProps { data: any[]; }

export function BudgetTable({ data }: BudgetTableProps) {
  return (
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
            {data.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Aucun centre budgétaire.</td></tr>
            ) : data.map((stat) => (
              <tr key={stat.centerName} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-700">{stat.centerName}</td>
                <td className="px-6 py-4 text-right tabular-nums">{fmt(stat.allocated)}</td>
                <td className="px-6 py-4 text-right tabular-nums font-semibold text-indigo-600">{fmt(stat.spent)}</td>
                <td className={`px-6 py-4 text-right tabular-nums ${stat.remaining < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                  {fmt(stat.remaining)}
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
  );
}
