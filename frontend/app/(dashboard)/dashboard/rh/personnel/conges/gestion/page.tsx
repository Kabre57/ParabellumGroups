'use client';

import { hrService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function CongesGestionPage() {
  const labels = LOGIPAIE_SHEETS['11-CONGÉS'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Congés - Gestion"
      description="Calcul des congés et suivi des périodes."
      queryKey={['logipaie-conges-gestion']}
      queryFn={() => hrService.getConges({ limit: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((conge: any) =>
          buildRowFromValues(
            [
              conge.matricule,
              conge.nomPersonnel ?? conge.nomComplet,
              conge.dateEntree,
              conge.dateRetourDernierConge,
              conge.salaireMoyen,
              conge.dateDebut,
              conge.anciennete,
              conge.periodeReference,
              conge.dureeConge ?? conge.nombreJours,
              conge.majoration,
              conge.dureeTotaleConge,
              conge.allocationCongePayee,
              conge.dateFin,
            ],
            labels,
            conge.id
          )
        )
      }
      emptyLabel="Aucun congé enregistré."
    />
  );
}
