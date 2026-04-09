'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/comptabilite/placements/formatters';
import type { PerformancePoint } from '@/types/comptabilite/placements';

interface PlacementsChartProps {
  history: PerformancePoint[];
  isLoading: boolean;
}

export function PlacementsChart({ history, isLoading }: PlacementsChartProps) {
  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Évolution de la Valeur &amp; ROI</h3>
          <p className="text-sm text-muted-foreground">Tendance historique basée sur les cours saisis.</p>
        </div>
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
          Reporting Mensuel
        </Badge>
      </div>
      <div className="h-[300px] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center italic text-muted-foreground">
            Chargement du graphique...
          </div>
        ) : history.length < 2 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
            Pas assez de données historiques pour afficher le graphique.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickFormatter={(val) =>
                  new Date(val).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
                }
              />
              <YAxis fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(val: number) => [formatCurrency(val), 'Valorisation']}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                }
              />
              <Area
                type="monotone"
                dataKey="totalValuation"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorVal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
