'use client';

import { useQuery } from '@tanstack/react-query';
import { logipaieService } from '@/shared/api/hr';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';
import { Spinner } from '@/components/ui/spinner';

export default function Etat301Page1() {
  const etatQuery = useQuery({
    queryKey: ['logipaie-etat-301-page-1'],
    queryFn: () => logipaieService.getEtat301({ pageSize: 200 }),
  });

  const rows = etatQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="État 301 - Page 1 (Régulation ITS)"
        description="Synthèse des régularisations ITS par employé."
      />

      {etatQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable
          columns={[
            { key: 'annee', label: 'Année' },
            { key: 'matricule', label: 'Matricule' },
            { key: 'salaireAnnuel', label: 'Salaire annuel', align: 'right' },
            { key: 'impotAnnuel', label: 'Impôt annuel', align: 'right' },
            { key: 'regularisation', label: 'Régularisation', align: 'right' },
            { key: 'dateDeclaration', label: 'Date déclaration' },
          ]}
          rows={rows}
          emptyLabel="Aucune donnée Etat 301 disponible."
        />
      )}
    </div>
  );
}
