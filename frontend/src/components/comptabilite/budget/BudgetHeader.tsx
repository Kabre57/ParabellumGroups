'use client';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BudgetHeaderProps {
  year: number;
  onExport?: () => void;
}

export function BudgetHeader({ year, onExport }: BudgetHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Budgétaire</h1>
        <p className="mt-2 text-muted-foreground italic">
          Suivi en temps réel de la consommation budgétaire par centre de responsabilité et filiale.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="h-10 border-indigo-100 bg-white">
          <Calendar className="mr-2 h-4 w-4 text-indigo-500" />
          Exercice {year}
        </Button>
        <Button className="h-10 bg-indigo-600 hover:bg-indigo-700" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Exporter Rapport
        </Button>
      </div>
    </div>
  );
}
