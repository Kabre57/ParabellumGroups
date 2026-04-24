'use client';

import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';

export function PaieTable({ rows }: { rows: Record<string, any>[] }) {
  return (
    <LogipaieTable
      columns={[
        { key: 'matricule', label: 'Matricule' },
        { key: 'periode', label: 'Période' },
        { key: 'brut', label: 'Brut', align: 'right' },
        { key: 'retenues', label: 'Retenues', align: 'right' },
        { key: 'net', label: 'Net', align: 'right' },
      ]}
      rows={rows}
      emptyLabel="Aucune paie disponible."
    />
  );
}
