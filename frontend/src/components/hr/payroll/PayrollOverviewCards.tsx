'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { PayrollOverview } from '@/shared/api/hr';

interface PayrollOverviewCardsProps {
  overview: PayrollOverview;
  formatCurrency: (amount: number) => string;
}

export function PayrollOverviewCards({ overview, formatCurrency }: PayrollOverviewCardsProps) {
  const cards = [
    {
      label: 'Effectif actif',
      value: `${overview.workforce.activeEmployees}`,
      helper: `${overview.workforce.totalEmployees} salariés suivis`,
    },
    {
      label: 'Masse salariale nette',
      value: formatCurrency(overview.payroll.totalNet),
      helper: overview.period.label,
    },
    {
      label: 'Coût employeur',
      value: formatCurrency(overview.payroll.totalEmployerCost),
      helper: 'Brut + charges patronales',
    },
    {
      label: 'Bulletins traités',
      value: `${overview.payroll.bulletinsCount}`,
      helper: `${overview.payroll.validatedCount} validés / ${overview.payroll.paidCount} payés`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-5">
          <div className="text-sm text-muted-foreground">{card.label}</div>
          <div className="mt-3 text-2xl font-semibold">{card.value}</div>
          <div className="mt-2 text-xs text-muted-foreground">{card.helper}</div>
        </Card>
      ))}
      <Card className="p-5 md:col-span-2 xl:col-span-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Périmètre PBL :</span>
          <Badge variant="outline">{overview.workforce.supportedInitialRange}</Badge>
          <Badge variant="outline">Capacité {overview.workforce.supportedScale} salariés</Badge>
          <Badge variant={overview.workforce.missingCnpsCount === 0 ? 'default' : 'secondary'}>
            CNPS manquants: {overview.workforce.missingCnpsCount}
          </Badge>
          <Badge variant={overview.workforce.missingCnamCount === 0 ? 'default' : 'secondary'}>
            CMU/CNAM manquants: {overview.workforce.missingCnamCount}
          </Badge>
        </div>
      </Card>
    </div>
  );
}

export default PayrollOverviewCards;
