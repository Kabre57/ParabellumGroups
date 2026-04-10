'use client';

import { Wallet, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(v || 0)
    .replace('XOF', 'F CFA');

interface DepensesStatsProps {
  totalCommitted: number;
  totalVouchered: number;
  totalDisbursed: number;
  pendingVouchersAmount: number;
}

export function DepensesStats({
  totalCommitted,
  totalVouchered,
  totalDisbursed,
  pendingVouchersAmount,
}: DepensesStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engagements</p>
            <p className="text-xl font-bold">{fmt(totalCommitted)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-indigo-500 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Receipt className="h-6 w-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bons Saisis</p>
            <p className="text-xl font-bold text-indigo-700">{fmt(totalVouchered)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <TrendingDown className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Décaissements</p>
            <p className="text-xl font-bold text-emerald-700">{fmt(totalDisbursed)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Wallet className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">En Attente</p>
            <p className="text-xl font-bold text-amber-700">{fmt(pendingVouchersAmount)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
