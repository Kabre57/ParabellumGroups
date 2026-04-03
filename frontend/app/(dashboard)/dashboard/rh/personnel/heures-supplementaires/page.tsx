'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function HeuresSupplementairesPage() {
  const labels = LOGIPAIE_SHEETS['10-HEURES SUPPLEMENTAIRES'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Heures supplémentaires"
      description="Heures sup et primes associées."
      queryKey={['logipaie-heures-supp']}
      queryFn={() => logipaieService.getVariablesMensuelles({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((vars: any) =>
          buildRowFromValues(
            [
              vars.matricule,
              vars.nomComplet,
              vars.salaireCategorielMensuel,
              vars.salaireHoraire,
              vars.heuresSupp15,
              vars.heuresSupp50,
              vars.heuresNuit,
              vars.heuresJourFerie,
              vars.heuresNuitFerie,
              vars.heuresSupp15,
              vars.heuresSupp50,
              vars.heuresNuit,
              vars.heuresJourFerie,
              vars.heuresNuitFerie,
            ],
            labels,
            vars.id
          )
        )
      }
      emptyLabel="Aucune heure supplémentaire enregistrée."
    />
  );
}
