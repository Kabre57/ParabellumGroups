'use client';
import { BarChart3, TrendingUp, DollarSign, FileText, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAccountingCurrency, formatAccountingPercent } from '@/components/accounting/accountingFormat';
import { exportAccountsCsv, exportEntriesCsv, exportTreasuryCsv, printAccountingReport } from '@/components/accounting/accountingExport';

interface RapportsQuickCardsProps {
  balanceSheet: any;
  incomeStatement: any;
  treasury: any;
  kpis: any;
  overview: any;
  period: string;
  canExport: boolean;
}
export function RapportsQuickCards({ balanceSheet, incomeStatement, treasury, kpis, overview, period, canExport }: RapportsQuickCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          {canExport && <Button size="sm" variant="outline" onClick={() => overview && exportAccountsCsv(overview.accounts, `bilan-${period}.csv`)}><Download className="h-3 w-3" /></Button>}
        </div>
        <h3 className="font-semibold mb-1">Bilan Comptable</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">{formatAccountingCurrency(balanceSheet?.totalAssets || 0)} d&apos;actifs</p>
      </Card>
      <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <TrendingUp className="h-8 w-8 text-green-500" />
          {canExport && <Button size="sm" variant="outline" onClick={() => overview && exportEntriesCsv(overview.entries, `resultat-${period}.csv`)}><Download className="h-3 w-3" /></Button>}
        </div>
        <h3 className="font-semibold mb-1">Compte de Résultat</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Résultat net: {formatAccountingCurrency(incomeStatement?.netResult || 0)}</p>
      </Card>
      <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <DollarSign className="h-8 w-8 text-purple-500" />
          {canExport && <Button size="sm" variant="outline" onClick={() => overview && exportTreasuryCsv(overview.treasuryMovements, `tresorerie-${period}.csv`)}><Download className="h-3 w-3" /></Button>}
        </div>
        <h3 className="font-semibold mb-1">Tableau de Trésorerie</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Solde: {formatAccountingCurrency(treasury?.closingBalance || 0)}</p>
      </Card>
      <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <FileText className="h-8 w-8 text-orange-500" />
          {canExport && <Button size="sm" variant="outline" onClick={() => overview && printAccountingReport('Analyse financière', overview)}><Download className="h-3 w-3" /></Button>}
        </div>
        <h3 className="font-semibold mb-1">Analyse Financière</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Marge nette: {formatAccountingPercent(kpis?.netMargin || 0)}</p>
      </Card>
    </div>
  );
}
