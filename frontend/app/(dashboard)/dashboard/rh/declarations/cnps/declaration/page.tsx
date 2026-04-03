'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function DeclarationCnpsPage() {
  const labels = LOGIPAIE_SHEETS['27-DÉCLARATION CNPS'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Déclaration CNPS"
      description="Déclaration CNPS par période."
      queryKey={['logipaie-cnps-declaration']}
      queryFn={() => logipaieService.getDeclarationsCnps({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((decl: any) =>
          buildRowFromValues(
            [
              decl.codeOperateur,
              decl.dateJournee,
              decl.numeroPiece,
              decl.periode,
              decl.codeVirement,
              decl.banque,
              decl.referenceTitre,
              decl.dateEmission,
              decl.totalCotisation,
              decl.visaDirecteur,
            ],
            labels,
            decl.id
          )
        )
      }
      emptyLabel="Aucune déclaration CNPS disponible."
    />
  );
}
