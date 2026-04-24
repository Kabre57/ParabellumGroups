'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PayrollOverview } from '@/shared/api/hr';

interface PayrollExportsPanelProps {
  overview: PayrollOverview;
  onExportDisa: () => void;
  onExportDgi: () => void;
  isExportingDisa?: boolean;
  isExportingDgi?: boolean;
}

export function PayrollExportsPanel({
  overview,
  onExportDisa,
  onExportDgi,
  isExportingDisa = false,
  isExportingDgi = false,
}: PayrollExportsPanelProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Déclarations & exports paie</h3>
          <p className="text-sm text-muted-foreground">
            Exports exploitables pour les obligations sociales et fiscales sur la période {overview.period.label}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExportDisa} disabled={isExportingDisa}>
            <Download className="mr-2 h-4 w-4" />
            {isExportingDisa ? 'Export DISA...' : 'Exporter DISA'}
          </Button>
          <Button variant="outline" onClick={onExportDgi} disabled={isExportingDgi}>
            <Download className="mr-2 h-4 w-4" />
            {isExportingDgi ? 'Export DGI...' : 'Exporter DGI'}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {overview.declarations.map((declaration) => (
          <div key={declaration.key} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{declaration.label}</div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{declaration.format}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{declaration.description}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default PayrollExportsPanel;
