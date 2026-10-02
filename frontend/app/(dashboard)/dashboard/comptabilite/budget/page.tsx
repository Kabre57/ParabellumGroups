'use client';
import { useState } from 'react';
import { useBudget } from '@/hooks/comptabilite/budget/useBudget';
import { BudgetHeader, BudgetStats, BudgetChart, BudgetTable } from '@/components/comptabilite/budget';

export default function BudgetPerformancePage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { data: budgetData, isLoading } = useBudget(selectedYear);

  const performance = budgetData?.data || [];
  const summary = budgetData?.summary || { totalAllocated: 0, totalSpent: 0, globalPerformance: 0 };

  return (
    <div className="space-y-6">
      <BudgetHeader year={selectedYear} onYearChange={setSelectedYear} onExport={() => {
        const rows = [['Centre de responsabilité', 'Budget alloué', 'Consommé', 'Reliquat', 'Taux (%)'], ...performance.map((row: any) => [row.centerName || '', row.allocated || 0, row.spent || 0, row.remaining || 0, row.performance || 0])];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = `budget-${selectedYear}.csv`; link.click(); URL.revokeObjectURL(url);
      }} />
      <BudgetStats summary={summary} count={performance.length} />
      <BudgetChart data={performance} isLoading={isLoading} />
      <BudgetTable data={performance} />
    </div>
  );
}
