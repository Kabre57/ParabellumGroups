'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function GratificationsPage() {
  const labels = LOGIPAIE_SHEETS['13-GRATIFICATIONS'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Gratifications"
      description="Primes annuelles et gratifications."
      queryKey={['logipaie-gratifications']}
      queryFn={() => logipaieService.getGratifications({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((grat: any) =>
          buildRowFromValues(
            [
              grat.matricule,
              grat.nomComplet,
              grat.dateEntree,
              grat.baseCalcul,
              grat.prorata,
              grat.tauxGratification,
              grat.montantBrut,
            ],
            labels,
            grat.id
          )
        )
      }
      emptyLabel="Aucune gratification enregistrée."
    />
  );
}
