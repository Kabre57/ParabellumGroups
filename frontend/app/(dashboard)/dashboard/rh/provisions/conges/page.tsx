'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function ProvisionsCongesPage() {
  const labels = LOGIPAIE_SHEETS['37-PROVISION CONGES'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Provision congés"
      description="Provisions de congés payés."
      queryKey={['logipaie-provisions-conges']}
      queryFn={() => logipaieService.getProvisionsConges({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((prov: any) =>
          buildRowFromValues(
            [
              prov.numero,
              prov.nomComplet,
              prov.regime,
              prov.dateEntree,
              prov.dateRetourDernierConge,
              prov.salaireBrutMoyenMensuel,
              prov.periodeReferenceMois,
              prov.dureeCongeJours,
              prov.majorationJours,
              prov.dureeTotaleConge,
              prov.congePaye,
              prov.isPatronal,
              prov.taxeFdfp,
              prov.cnpsRetraite,
              prov.cnpsAt,
              prov.cnpsPf,
              prov.montantProvision,
            ],
            labels,
            prov.id
          )
        )
      }
      emptyLabel="Aucune provision congés disponible."
    />
  );
}
