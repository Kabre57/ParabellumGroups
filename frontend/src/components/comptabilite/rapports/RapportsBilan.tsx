'use client';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';

interface RapportsBilanProps {
  balanceSheet: any;
  clientReceivables: number;
}
export function RapportsBilan({ balanceSheet, clientReceivables }: RapportsBilanProps) {
  const totalPassif = (balanceSheet?.totalLiabilities || 0) + (balanceSheet?.totalEquity || 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-500" />Actif (Assets)</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="font-medium">Actifs circulants et fiscaux</span>
            <span className="font-bold text-blue-600">{formatAccountingCurrency(balanceSheet?.totalAssets || 0)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="font-medium">Créances clients</span>
            <span className="font-bold text-blue-600">{formatAccountingCurrency(clientReceivables)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
            <span className="font-bold">TOTAL ACTIF</span>
            <span className="font-bold text-blue-700">{formatAccountingCurrency(balanceSheet?.totalAssets || 0)}</span>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" />Passif (Liabilities)</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="font-medium">Capitaux Propres</span>
            <span className="font-bold text-green-600">{formatAccountingCurrency(balanceSheet?.totalEquity || 0)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="font-medium">Dettes</span>
            <span className="font-bold text-red-600">{formatAccountingCurrency(balanceSheet?.totalLiabilities || 0)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
            <span className="font-bold">TOTAL PASSIF</span>
            <span className="font-bold text-blue-700">{formatAccountingCurrency(totalPassif)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
