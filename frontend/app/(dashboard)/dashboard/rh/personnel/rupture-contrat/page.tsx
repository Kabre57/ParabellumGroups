'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function RuptureContratPage() {
  const labels = LOGIPAIE_SHEETS['14-INDEMNITES DE RUPTURE'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Indemnités de rupture"
      description="Ruptures de contrat et indemnités associées."
      queryKey={['logipaie-ruptures-contrat']}
      queryFn={() => logipaieService.getRupturesContrat({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((rupture: any) =>
          buildRowFromValues(
            [
              rupture.matricule,
              rupture.nomComplet,
              rupture.dateEntree,
              rupture.contrat,
              rupture.salaireCategoriel,
              rupture.type,
              rupture.statut,
              rupture.motifRupture,
              rupture.dateRupture,
              rupture.dateRetourDernierConge,
              rupture.salaireMoyenMensuel,
              rupture.salairePeriodeCdd,
              rupture.gratification,
              rupture.indemniteConventionnelle,
              rupture.nombreMoisPreavis,
              rupture.indemnitePreavis,
              rupture.indemniteLicenciement,
              rupture.indemniteCongesPayes,
              rupture.gratification,
              rupture.fraisFuneraires,
              rupture.indemniteRuptureConventionnelle,
              rupture.montantTotalDu,
            ],
            labels,
            rupture.id
          )
        )
      }
      emptyLabel="Aucune rupture de contrat enregistrée."
    />
  );
}
