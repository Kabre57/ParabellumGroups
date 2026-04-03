'use client';

import { hrService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function PersonnelPretsPage() {
  const labels = LOGIPAIE_SHEETS['18-PRÊTS'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Gestion des prêts"
      description="Prêts et avances accordés au personnel."
      queryKey={['logipaie-prets']}
      queryFn={() => hrService.getLoans({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((loan: any) =>
          buildRowFromValues(
            [
              loan.dureeMois ?? loan.nombreMoisRemboursement,
              loan.mensualiteRetenue,
              loan.dateDebutRemboursement,
              loan.dateFinRemboursement,
              loan.prelevementMois,
              loan.moisDejaPreleves,
              loan.moisPreleves,
              loan.montantRestantDu,
              loan.moisRestants,
            ],
            labels,
            loan.id
          )
        )
      }
      emptyLabel="Aucun prêt enregistré."
    />
  );
}
