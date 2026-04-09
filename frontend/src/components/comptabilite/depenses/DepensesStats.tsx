'use client';
import { Wallet, Receipt } from 'lucide-react';
import { Card } from '@/components/ui/card';

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(v || 0).replace('XOF', 'F CFA');

interface DepensesStatsProps {
  totalSpending: number;
  totalEncaissements: number;
  totalDecaissements: number;
  pendingCount: number;
}
export function DepensesStats({ totalSpending, totalEncaissements, totalDecaissements, pendingCount }: DepensesStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card className="p-4 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-blue-500" />
          <div><p className="text-xs font-medium text-muted-foreground uppercase">Total Dépenses</p><p className="text-xl font-bold">{fmt(totalSpending)}</p></div>
        </div>
      </Card>
      <Card className="p-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-emerald-500" />
          <div><p className="text-xs font-medium text-muted-foreground uppercase">Encaissements</p><p className="text-xl font-bold text-emerald-700">{fmt(totalEncaissements)}</p></div>
        </div>
      </Card>
      <Card className="p-4 border-l-4 border-l-rose-500">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-rose-500" />
          <div><p className="text-xs font-medium text-muted-foreground uppercase">Décaissements</p><p className="text-xl font-bold text-rose-700">{fmt(totalDecaissements)}</p></div>
        </div>
      </Card>
      <Card className="p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-amber-500" />
          <div><p className="text-xs font-medium text-muted-foreground uppercase">En Attente</p><p className="text-xl font-bold">{pendingCount}</p></div>
        </div>
      </Card>
    </div>
  );
}
