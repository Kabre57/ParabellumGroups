'use client';

import { FileSpreadsheet, Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DepensesHeaderProps {
  period: 'month' | 'quarter' | 'year' | 'all';
  onPeriodChange: (period: 'month' | 'quarter' | 'year' | 'all') => void;
  onPrintList: () => void;
  onImport: () => void;
  onNewEncaissement: () => void;
  onNewDecaissement: () => void;
  canCreate: boolean;
  canImport: boolean;
}

export function DepensesHeader({
  period,
  onPeriodChange,
  onPrintList,
  onImport,
  onNewEncaissement,
  onNewDecaissement,
  canCreate,
  canImport,
}: DepensesHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold">Flux de caisse et depenses</h1>
        <p className="mt-2 text-muted-foreground">
          Suivez distinctement les engagements achats, les encaissements clients, les decaissements fournisseurs
          et les pieces de caisse avant comptabilisation.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={period}
          onChange={(event) => onPeriodChange(event.target.value as any)}
          className="px-4 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="month">Ce mois</option>
          <option value="quarter">Ce trimestre</option>
          <option value="year">Cette année</option>
          <option value="all">Toutes les périodes</option>
        </select>
        <Button variant="outline" onClick={onPrintList}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimer la liste
        </Button>
        {canImport && (
          <Button variant="outline" onClick={onImport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
        )}
        {canCreate && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={onNewEncaissement}
            >
              <Plus className="h-4 w-4" />
              Encaissement
            </Button>
            <Button
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700"
              onClick={onNewDecaissement}
            >
              <Plus className="h-4 w-4" />
              Décaissement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
