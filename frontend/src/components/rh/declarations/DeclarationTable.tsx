'use client';

import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';

export function DeclarationTable({ rows }: { rows: Record<string, any>[] }) {
  return (
    <LogipaieTable
      columns={[
        { key: 'periode', label: 'Période' },
        { key: 'type', label: 'Type' },
        { key: 'matricule', label: 'Matricule' },
        { key: 'montant', label: 'Montant', align: 'right' },
        { key: 'statut', label: 'Statut' },
      ]}
      rows={rows}
      emptyLabel="Aucune déclaration disponible."
    />
  );
}
