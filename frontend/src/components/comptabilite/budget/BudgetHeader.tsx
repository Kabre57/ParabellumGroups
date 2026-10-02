'use client';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BudgetHeaderProps {
  year: number;
  onExport?: () => void;
  onYearChange?: (year: number) => void;
}

export function BudgetHeader({ year, onExport, onYearChange }: BudgetHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Budgétaire</h1>
        <p className="mt-2 text-muted-foreground italic">
          Suivi en temps réel de la consommation budgétaire par centre de responsabilité et filiale.
        </p>
      </div>
      <div className="flex gap-2">
        <label className="flex h-10 items-center gap-2 rounded-md border border-indigo-100 bg-white px-3 text-sm">
          <Calendar className="h-4 w-4 text-indigo-500" />
          Exercice
          <select aria-label="Année budgétaire" className="bg-transparent font-medium outline-none" value={year} onChange={(event) => onYearChange?.(Number(event.target.value))}>
            {Array.from({ length: 7 }, (_, index) => new Date().getFullYear() + 2 - index).map((optionYear) => <option key={optionYear} value={optionYear}>{optionYear}</option>)}
          </select>
        </label>
        <Button className="h-10 bg-indigo-600 hover:bg-indigo-700" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Exporter Rapport
        </Button>
      </div>
    </div>
  );
}
