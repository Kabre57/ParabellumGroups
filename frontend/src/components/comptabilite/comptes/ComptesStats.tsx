'use client';
import { BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';

interface Totals { assets: number; liabilities: number; revenues: number; expenses: number; }

export function ComptesStats({ count, totals }: { count: number; totals: Totals }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Total Comptes</p><p className="text-2xl font-bold">{count}</p></div>
          <BookOpen className="h-8 w-8 text-blue-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Actifs</p><p className="text-2xl font-bold text-blue-600">{formatAccountingCurrency(totals.assets)}</p></div>
          <BookOpen className="h-8 w-8 text-blue-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Passifs</p><p className="text-2xl font-bold text-red-600">{formatAccountingCurrency(totals.liabilities)}</p></div>
          <BookOpen className="h-8 w-8 text-red-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-600 dark:text-gray-400">Résultat Net</p><p className="text-2xl font-bold text-green-600">{formatAccountingCurrency(totals.revenues - totals.expenses)}</p></div>
          <BookOpen className="h-8 w-8 text-green-500" />
        </div>
      </Card>
    </div>
  );
}
