'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InvestmentPortfolioSummary } from '@/shared/api/billing/types';
import { formatCurrency } from '@/shared/utils/format';
import { 
  Wallet, 
  TrendingUp, 
  BarChart3, 
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface PortfolioStatsProps {
  summary: {
    totalBookValue: number;
    totalMarketValue: number;
    totalAccruedInterest: number;
    unrealizedGainLoss: number;
    positionsCount: number;
  };
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({ summary }) => {
  const plPercent = summary.totalBookValue > 0 
    ? (summary.unrealizedGainLoss / summary.totalBookValue) * 100 
    : 0;

  const stats = [
    {
      title: "Valeur Totale Marché",
      value: formatCurrency(summary.totalMarketValue),
      subValue: `Cpt: ${formatCurrency(summary.totalBookValue)}`,
      icon: Wallet,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      title: "Plus-Value Latente",
      value: formatCurrency(summary.unrealizedGainLoss),
      subValue: `${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%`,
      icon: TrendingUp,
      color: summary.unrealizedGainLoss >= 0 ? "text-emerald-600" : "text-rose-600",
      bgColor: summary.unrealizedGainLoss >= 0 ? "bg-emerald-50" : "bg-rose-50",
      trend: plPercent >= 0 ? 'up' : 'down'
    },
    {
      title: "Intérêts Courus",
      value: formatCurrency(summary.totalAccruedInterest),
      subValue: "Revenus attendus",
      icon: BarChart3,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Positions Actives",
      value: summary.positionsCount.toString(),
      subValue: "Actifs en portefeuille",
      icon: ShieldAlert,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="shadow-sm border-none bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center mt-1">
              {stat.trend && (
                stat.trend === 'up' 
                  ? <ArrowUpRight className="h-3 w-3 mr-1 text-emerald-600" />
                  : <ArrowDownRight className="h-3 w-3 mr-1 text-rose-600" />
              )}
              <p className={`text-xs ${stat.trend ? (stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600') : 'text-muted-foreground'}`}>
                {stat.subValue}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
