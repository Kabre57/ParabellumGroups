'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logipaieService } from '@/shared/api/hr';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';
import { Spinner } from '@/components/ui/spinner';

export default function RegulAnnuelleFdfpPage() {
  const declarationQuery = useQuery({
    queryKey: ['logipaie-declarations-fiscales'],
    queryFn: () => logipaieService.getDeclarationsFiscales({ pageSize: 200 }),
  });

  const rows = useMemo(() => {
    const data = declarationQuery.data?.data ?? [];
    return data.filter((row: any) => row.typeDeclaration === 'FDFP');
  }, [declarationQuery.data]);

  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="Régulation annuelle FDFP"
        description="Synthèse des déclarations FDFP et régularisations."
      />

      {declarationQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable
          columns={[
            { key: 'periode', label: 'Période' },
            { key: 'matricule', label: 'Matricule' },
            { key: 'salaireImposable', label: 'Salaire imposable', align: 'right' },
            { key: 'montantIs', label: 'Montant IS', align: 'right' },
            { key: 'montantCn', label: 'Montant CN', align: 'right' },
            { key: 'montantIgr', label: 'Montant IGR', align: 'right' },
            { key: 'totalImpots', label: 'Total impôts', align: 'right' },
            { key: 'statut', label: 'Statut' },
          ]}
          rows={rows}
          emptyLabel="Aucune régulation FDFP disponible."
        />
      )}
    </div>
  );
}
