'use client';

import { useQuery } from '@tanstack/react-query';
import { hrService } from '@/shared/api/hr';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';
import { Spinner } from '@/components/ui/spinner';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import { buildColumnsFromLabels, buildRowFromValues } from '@/components/hr/logipaie/logipaieColumns';

export default function IndicateursRhPage() {
  const statsQuery = useQuery({
    queryKey: ['logipaie-indicateurs-rh'],
    queryFn: () => hrService.getEmployees({ pageSize: 200 }),
  });

  const rows = statsQuery.data?.data ?? [];
  const labels = LOGIPAIE_SHEETS['41-INDICATEURS RH'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="Indicateurs RH"
        description="Synthèse des effectifs, turnover, masse salariale et indicateurs clés."
      />

      {statsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable
          columns={columns}
          rows={rows.map((row: any) =>
            buildRowFromValues(
              [
                row.matricule ?? row.id,
                row.civilite,
                row.nomComplet || `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
                row.sexe,
                row.dateNaissance,
                row.codeNationalite,
                row.situationMatrimoniale,
                row.contrat,
                row.dateEntree ?? row.dateCreation,
                row.dateSortie,
                row.codeEmploi,
                row.joursTravailles,
                row.brutSocial,
                row.congePaye,
                row.entreesMois,
                row.sortiesMois,
                row.validation,
                row.sexe,
                row.codeNationalite,
                row.situationMatrimoniale,
                row.contrat,
                row.codeEmploi,
                row.ageValide,
                row.trancheMoins25,
                row.tranche25_30,
                row.tranche30_40,
                row.tranche40_50,
                row.tranchePlus50,
                row.trancheMoins25Femmes,
                row.tranche25_30Femmes,
                row.tranche30_40Femmes,
                row.tranche40_50Femmes,
                row.tranchePlus50Femmes,
                row.joursTravailles,
                row.brutSocial,
                row.congePaye,
              ],
              labels,
              row.id
            )
          )}
          emptyLabel="Aucun indicateur RH enregistré."
        />
      )}
    </div>
  );
}
