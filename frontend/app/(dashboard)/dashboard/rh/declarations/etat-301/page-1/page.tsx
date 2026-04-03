'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function DeclarationEtat301Page1() {
  const labels = LOGIPAIE_SHEETS['31-ETAT 301 PAGE 1 (REGUL ITS)'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Etat 301 - Page 1"
      description="Régularisation ITS (page 1)."
      queryKey={['logipaie-etat-301-p1']}
      queryFn={() => logipaieService.getEtat301({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((etat: any) =>
          buildRowFromValues(
            [
              etat.numero,
              etat.natureImpots,
              etat.personnelLocal,
              etat.personnelExpatrie,
              etat.regimeAgricole,
              etat.total,
            ],
            labels,
            etat.id
          )
        )
      }
      emptyLabel="Aucun Etat 301 page 1 disponible."
    />
  );
}
