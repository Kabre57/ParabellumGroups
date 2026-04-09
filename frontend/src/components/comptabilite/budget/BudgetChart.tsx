'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(v || 0).replace('XOF', 'F CFA');

interface BudgetChartProps { data: any[]; isLoading: boolean; }

export function BudgetChart({ data, isLoading }: BudgetChartProps) {
  return (
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
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            Aucune donnée budgétaire pour cet exercice.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="centerName" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis fontSize={11} tick={{ fill: '#6b7280' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(val: number) => [fmt(val), '']} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar name="Budget Alloué" dataKey="allocated" fill="#e0e7ff" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar name="Dépenses Réelles" dataKey="spent" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.performance > 100 ? '#ef4444' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
