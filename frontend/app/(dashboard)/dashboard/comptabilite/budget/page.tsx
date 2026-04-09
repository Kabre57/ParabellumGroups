'use client';
import { useState } from 'react';
import { useBudget } from '@/hooks/comptabilite/budget/useBudget';
import { BudgetHeader, BudgetStats, BudgetChart, BudgetTable } from '@/components/comptabilite/budget';

export default function BudgetPerformancePage() {
  const [selectedYear] = useState(new Date().getFullYear());
  const { data: budgetData, isLoading } = useBudget(selectedYear);

  const performance = budgetData?.data || [];
  const summary = budgetData?.summary || { totalAllocated: 0, totalSpent: 0, globalPerformance: 0 };

  return (
    <div className="space-y-6">
      <BudgetHeader year={selectedYear} />
      <BudgetStats summary={summary} count={performance.length} />
      <BudgetChart data={performance} isLoading={isLoading} />
      <BudgetTable data={performance} />
    </div>
  );
}
