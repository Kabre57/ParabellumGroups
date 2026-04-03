'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function DeclarationEtat301Page2() {
  const labels = LOGIPAIE_SHEETS['32-ETAT 301 PAGE 2 (DETAIL)'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Etat 301 - Page 2"
      description="Détail Etat 301 (page 2)."
      queryKey={['logipaie-etat-301-p2']}
      queryFn={() => logipaieService.getEtat301({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((etat: any) =>
          buildRowFromValues(
            [
              etat.numero,
              etat.numeroCnps,
              etat.nomComplet,
              etat.emploi,
              etat.regime,
              etat.sexe,
              etat.nationalite,
              etat.localExpatrie,
              etat.etatCivil,
              etat.nombreEnfants,
              etat.nombrePartsIgr,
              etat.nombreJoursApplication,
              etat.montantSalaires,
              etat.avantagesNatureBareme,
              etat.avantagesNatureReel,
              etat.salaireBrut,
              etat.impotIs,
              etat.impotCn,
              etat.impotIgr,
              etat.montant,
              etat.designation,
            ],
            labels,
            etat.id
          )
        )
      }
      emptyLabel="Aucun Etat 301 page 2 disponible."
    />
  );
}
