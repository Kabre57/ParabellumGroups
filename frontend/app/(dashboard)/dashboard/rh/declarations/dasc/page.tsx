'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function DeclarationDascPage() {
  const labels = LOGIPAIE_SHEETS['35-DASC'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="DASC"
      description="Déclarations DASC."
      queryKey={['logipaie-dasc']}
      queryFn={() => logipaieService.getDascs({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((dasc: any) =>
          buildRowFromValues(
            [
              dasc.dateJournee,
              dasc.numeroPiece,
              dasc.periode,
              dasc.codeVersement,
              dasc.banque,
              dasc.referenceTitre,
              dasc.dateEmission,
              dasc.montant,
              dasc.visa,
            ],
            labels,
            dasc.id
          )
        )
      }
      emptyLabel="Aucune DASC disponible."
    />
  );
}
