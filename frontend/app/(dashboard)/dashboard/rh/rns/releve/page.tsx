'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function RnsRelevePage() {
  const labels = LOGIPAIE_SHEETS['17-RNS'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Relevé nominatif (RNS)"
      description="Relevé nominatif des salaires."
      queryKey={['logipaie-releve-rns']}
      queryFn={() => logipaieService.getDeclarationsCnps({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((row: any) =>
          buildRowFromValues(
            [
              row.nomEmployeur,
              row.numeroEmployeur,
              row.salaireAnnuel,
              row.nombreMoisPresence,
              row.dateLieu,
            ],
            labels,
            row.id
          )
        )
      }
      emptyLabel="Aucun relevé RNS disponible."
    />
  );
}
