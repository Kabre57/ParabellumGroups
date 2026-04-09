'use client';
import { TrendingUp, BarChart3, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAccountingPercent } from '@/components/accounting/accountingFormat';

interface RapportsKPIsProps {
  kpis: any;
  balanceSheet: any;
}
export function RapportsKPIs({ kpis, balanceSheet }: RapportsKPIsProps) {
  const debtRatio = balanceSheet?.totalAssets
    ? ((balanceSheet.totalLiabilities || 0) / balanceSheet.totalAssets) * 100
    : 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Marge Nette</p><p className="text-2xl font-bold text-green-600">{formatAccountingPercent(kpis?.netMargin || 0)}</p></div>
          <TrendingUp className="h-8 w-8 text-green-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Taux d&apos;Endettement</p><p className="text-2xl font-bold text-orange-600">{formatAccountingPercent(debtRatio)}</p></div>
          <BarChart3 className="h-8 w-8 text-orange-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Taux de couverture décaissements</p><p className="text-2xl font-bold text-blue-600">{formatAccountingPercent(kpis?.disbursementCoverage || 0)}</p></div>
          <DollarSign className="h-8 w-8 text-blue-500" />
        </div>
      </Card>
    </div>
  );
}
