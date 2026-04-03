'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function RnsDonneesPage() {
  const labels = LOGIPAIE_SHEETS['16-DONNÉES RNS'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Données RNS"
      description="Données nominatives des salaires."
      queryKey={['logipaie-donnees-rns']}
      queryFn={() => logipaieService.getDeclarationsCnps({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((row: any) =>
          buildRowFromValues(
            [
              row.nombreMoisPresence,
              row.salaireSoumisCnps,
              row.observations,
            ],
            labels,
            row.id
          )
        )
      }
      emptyLabel="Aucune donnée RNS disponible."
    />
  );
}
