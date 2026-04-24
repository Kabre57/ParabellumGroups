'use client';

import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';

export function PersonnelTable({ rows }: { rows: Record<string, any>[] }) {
  return (
    <LogipaieTable
      columns={[
        { key: 'matricule', label: 'Matricule' },
        { key: 'nomComplet', label: 'Nom complet' },
        { key: 'sexe', label: 'Sexe' },
        { key: 'telephone', label: 'Téléphone' },
        { key: 'email', label: 'Email' },
        { key: 'statut', label: 'Statut' },
      ]}
      rows={rows}
      emptyLabel="Aucun personnel disponible."
    />
  );
}
