'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function DeclarationDisaPage() {
  const labels = LOGIPAIE_SHEETS['34-DISA'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="DISA"
      description="Déclarations DISA."
      queryKey={['logipaie-disa']}
      queryFn={() => logipaieService.getDisas({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((disa: any) =>
          buildRowFromValues(
            [
              disa.numeroOrdre,
              disa.nom,
              disa.prenom,
              disa.numeroCnps ?? disa.matricule,
              disa.anneeNaissance,
              disa.dateEmbauche,
              disa.dateDepart,
              disa.typeSalarie,
              disa.salaireAnnuel,
              disa.dureeActivite,
              disa.montantPfAt,
              disa.montantRetraite,
              disa.regime,
              disa.observation,
            ],
            labels,
            disa.id
          )
        )
      }
      emptyLabel="Aucune DISA disponible."
    />
  );
}
