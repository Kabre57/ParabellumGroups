'use client';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';

interface EcrituresStatsProps {
  total: number;
  totalDebit: number;
  totalCredit: number;
}

export function EcrituresStats({ total, totalDebit, totalCredit }: EcrituresStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Écritures</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <FileText className="h-8 w-8 text-blue-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Débit</p>
            <p className="text-2xl font-bold text-green-600">{formatAccountingCurrency(totalDebit)}</p>
          </div>
          <FileText className="h-8 w-8 text-green-500" />
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Crédit</p>
            <p className="text-2xl font-bold text-red-600">{formatAccountingCurrency(totalCredit)}</p>
          </div>
          <FileText className="h-8 w-8 text-red-500" />
        </div>
      </Card>
    </div>
  );
}
