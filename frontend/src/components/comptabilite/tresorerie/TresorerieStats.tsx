'use client';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';

interface TresorerieStatsProps {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
}
export function TresorerieStats({ currentBalance, totalIncome, totalExpense }: TresorerieStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Solde Actuel</p><p className="text-2xl font-bold">{formatAccountingCurrency(currentBalance)}</p></div>
          <Wallet className="h-8 w-8 text-blue-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Encaissements</p><p className="text-2xl font-bold text-green-600">+{formatAccountingCurrency(totalIncome)}</p></div>
          <TrendingUp className="h-8 w-8 text-green-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Décaissements</p><p className="text-2xl font-bold text-red-600">-{formatAccountingCurrency(totalExpense)}</p></div>
          <TrendingDown className="h-8 w-8 text-red-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Solde Net</p><p className="text-2xl font-bold">{formatAccountingCurrency(totalIncome - totalExpense)}</p></div>
          <DollarSign className="h-8 w-8 text-purple-500" />
        </div>
      </Card>
    </div>
  );
}
