'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function DeclarationItsPage() {
  const labels = LOGIPAIE_SHEETS['24-DÉCLARATION ITS '];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Déclaration ITS"
      description="Déclarations ITS par période."
      queryKey={['logipaie-declaration-its']}
      queryFn={() => logipaieService.getDeclarationsFiscales({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((decl: any) =>
          buildRowFromValues(
            [
              decl.numero,
              decl.typeDeclaration,
              decl.categorieSalaries,
              decl.effectifs,
              decl.salaireImposable,
              decl.taux,
              decl.montantIs ?? decl.totalImpots,
            ],
            labels,
            decl.id
          )
        )
      }
      emptyLabel="Aucune déclaration ITS disponible."
    />
  );
}
