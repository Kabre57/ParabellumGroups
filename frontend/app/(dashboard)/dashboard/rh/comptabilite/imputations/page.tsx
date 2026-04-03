'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function ImputationsComptablesPage() {
  const labels = LOGIPAIE_SHEETS['28-IMPUTATIONS COMPTABLES'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Imputations comptables"
      description="Écritures comptables générées par la paie."
      queryKey={['logipaie-imputations']}
      queryFn={() => logipaieService.getEcrituresComptables({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((ecriture: any) =>
          buildRowFromValues(
            [
              ecriture.dateEcriture,
              ecriture.numeroPiece,
              ecriture.referencePiece,
              ecriture.referenceOperation,
              ecriture.compteDebit,
              ecriture.compteCredit,
              ecriture.libelleOperation,
              ecriture.dateEcheance,
              ecriture.montantDebit,
              ecriture.montantCredit,
            ],
            labels,
            ecriture.id
          )
        )
      }
      emptyLabel="Aucune imputation disponible."
    />
  );
}
