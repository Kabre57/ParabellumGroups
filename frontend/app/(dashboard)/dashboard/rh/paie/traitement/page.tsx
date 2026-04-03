'use client';

import { hrService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function PaieTraitementPage() {
  const labels = LOGIPAIE_SHEETS['9-TRAITEMENT DE LA PAIE'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Traitement de la paie"
      description="Traitement mensuel de la paie (brut, retenues, net)."
      queryKey={['logipaie-paie-traitement']}
      queryFn={() => hrService.getPayrolls({ pageSize: 200 })}
      columns={columns}
      emptyLabel="Aucun traitement de paie enregistré."
      mapRows={(rows) =>
        rows.map((row: any) =>
          buildRowFromValues(
            [
              row.joursTravailles,
              row.salaireBase,
              row.heuresSuppMontant,
              row.primeAnciennete,
              row.primeTransport,
              row.autresPrimesIndemnites,
              row.congePaye,
              row.gratification,
              row.preavis,
              row.indemniteLicenciement,
              row.indemniteTransactionnelle,
              row.fraisFuneraires,
              row.retenuesFiscalesSociales,
              row.autresRetenues,
              row.totalRetenues,
              row.datePaie,
              row.partsIgr,
              row.salaireBrut,
            ],
            labels,
            row.id
          )
        )
      }
    />
  );
}
