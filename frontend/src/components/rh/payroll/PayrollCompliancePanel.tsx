'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { PayrollOverview } from '@/shared/api/hr';

interface PayrollCompliancePanelProps {
  overview: PayrollOverview;
}

const statusMap = {
  ok: { label: 'Conforme', className: 'bg-green-100 text-green-800' },
  warning: { label: 'A surveiller', className: 'bg-amber-100 text-amber-800' },
  critical: { label: 'Bloquant', className: 'bg-red-100 text-red-800' },
} as const;

export function PayrollCompliancePanel({ overview }: PayrollCompliancePanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Conformité légale CI</h3>
          <p className="text-sm text-muted-foreground">
            Contrôle des prérequis Code du travail, CNPS, CMU/CNAM, DGI, ITS.
          </p>
        </div>
        <div className="space-y-3">
          {overview.compliance.map((item) => (
            <div key={item.key} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{item.label}</div>
                <Badge className={statusMap[item.status].className}>{statusMap[item.status].label}</Badge>
              </div>
              <div className="mt-2 text-sm font-medium">{item.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="text-lg font-semibold">Référentiel paie actif</h3>
          <div className="mt-4 space-y-2 text-sm">
            {overview.legalRates.map((rate) => (
              <div key={rate.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span>{rate.label}</span>
                <span className="font-semibold">
                  {typeof rate.value === 'number' ? rate.value.toLocaleString('fr-FR') : rate.value} {rate.unit || ''}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold">Fonctionnalités attendues</h3>
          <div className="mt-4 space-y-2 text-sm">
            {overview.features.map((feature) => (
              <div key={feature.key} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{feature.label}</span>
                  <Badge variant={feature.available ? 'default' : 'destructive'}>
                    {feature.available ? 'Disponible' : 'À compléter'}
                  </Badge>
                </div>
                <div className="mt-1 text-muted-foreground">{feature.description}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default PayrollCompliancePanel;
