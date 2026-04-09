'use client';

import { DollarSign, PieChart, TrendingUp, History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/utils/placements/formatters';
import type { PlacementSummary } from '@/types/placements';

interface PlacementsStatsProps {
  summary: PlacementSummary;
  count: number;
}

export function PlacementsStats({ summary, count }: PlacementsStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card className="p-4 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-50 p-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Investi</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalInvested)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-indigo-500">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-indigo-50 p-2">
            <PieChart className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Valorisation Actuelle</p>
            <p className="text-xl font-bold text-indigo-700">{formatCurrency(summary.currentValuation)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-50 p-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Plus/Moins Value</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-bold ${summary.totalGainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(summary.totalGainLoss)}
              </p>
              <Badge variant={summary.totalGainLoss >= 0 ? ('success' as any) : 'destructive'}>
                {formatPercent(summary.totalGainLossPercent)}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-50 p-2">
            <History className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Actifs Engagés</p>
            <p className="text-xl font-bold">{count} placements</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
