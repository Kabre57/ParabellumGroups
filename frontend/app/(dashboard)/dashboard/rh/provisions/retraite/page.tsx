'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function ProvisionsRetraitePage() {
  const labels = LOGIPAIE_SHEETS['38-PROVISION RETRAITE'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Provision retraite"
      description="Provisions retraite et indemnités estimées."
      queryKey={['logipaie-provisions-retraite']}
      queryFn={() => logipaieService.getProvisionsRetraite({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((prov: any) =>
          buildRowFromValues(
            [
              prov.numero,
              prov.nomComplet,
              prov.regime,
              prov.dateEntree,
              prov.anciennete,
              prov.salaireBrutMoyenMensuel,
              prov.fraction1a5,
              prov.fraction5a10,
              prov.fractionPlus10,
              prov.indemniteFinCarriereEstimee,
              prov.isPatronal,
              prov.taxeFdfp,
              prov.cnpsRetraite,
              prov.cnpsAt,
              prov.cnpsPf,
              prov.provisionCumulee,
              prov.cotisationsPatronales,
              prov.tauxProvision,
            ],
            labels,
            prov.id
          )
        )
      }
      emptyLabel="Aucune provision retraite disponible."
    />
  );
}
