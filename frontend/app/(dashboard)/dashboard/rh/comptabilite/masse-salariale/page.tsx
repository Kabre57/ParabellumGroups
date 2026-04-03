'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function MasseSalarialePage() {
  const labels = LOGIPAIE_SHEETS['30-RECAP. MASSE SALARIALE'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Masse salariale"
      description="Récapitulatif de la masse salariale."
      queryKey={['logipaie-livre-mensuel-masse']}
      queryFn={() => logipaieService.getLivresPaieMensuels({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((row: any) =>
          buildRowFromValues(
            [
              row.libelle,
              row.janvier,
              row.fevrier,
              row.mars,
              row.avril,
              row.mai,
              row.juin,
              row.juillet,
              row.aout,
              row.septembre,
              row.octobre,
              row.novembre,
              row.decembre,
              row.total,
            ],
            labels,
            row.id
          )
        )
      }
      emptyLabel="Aucune masse salariale disponible."
    />
  );
}
