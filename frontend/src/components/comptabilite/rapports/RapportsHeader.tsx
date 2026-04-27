'use client';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportAccountsCsv, printAccountingReport } from '@/components/accounting/accountingExport';

interface RapportsHeaderProps {
  period: 'month' | 'quarter' | 'year';
  onPeriodChange: (p: 'month' | 'quarter' | 'year') => void;
  canExport: boolean;
  overview: any;
}
export function RapportsHeader({ period, onPeriodChange, canExport, overview }: RapportsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">Rapports Financiers</h1>
        <p className="text-muted-foreground mt-2">Bilans, comptes de résultat et analyses financières</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/comptabilite/balance">Balance</Link>
        </Button>
        <select value={period} onChange={(e) => onPeriodChange(e.target.value as any)} className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700">
          <option value="month">Ce mois</option>
          <option value="quarter">Ce trimestre</option>
          <option value="year">Cette année</option>
        </select>
        {canExport && (
          <>
            <Button variant="outline" onClick={() => overview && exportAccountsCsv(overview.accounts, `plan-comptable-${period}.csv`)}>
              <Download className="h-4 w-4 mr-2" />Exporter Excel
            </Button>
            <Button onClick={() => overview && printAccountingReport('Rapports comptables', overview)}>
              <Download className="h-4 w-4 mr-2" />Exporter PDF
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
