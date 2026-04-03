'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function DeclarationCnpsListePage() {
  const labels = LOGIPAIE_SHEETS['26-LISTE NOMINATIVE COTI. CNPS '];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Liste nominative CNPS"
      description="Liste nominative de cotisation CNPS."
      queryKey={['logipaie-cnps-liste']}
      queryFn={() => logipaieService.getDeclarationsCnps({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((decl: any) =>
          buildRowFromValues(
            [
              decl.numeroCnps ?? decl.matricule,
              decl.nom,
              decl.prenoms,
              decl.anneeNaissance,
              decl.dateEmbauche,
              decl.dateDepart,
              decl.typeSalarie,
              decl.dureeTravaillee,
              decl.salaireSoumisCnps,
              decl.brancheCotisee,
            ],
            labels,
            decl.id
          )
        )
      }
      emptyLabel="Aucune liste CNPS disponible."
    />
  );
}
