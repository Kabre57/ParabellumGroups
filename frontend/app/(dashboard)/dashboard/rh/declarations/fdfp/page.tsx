'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';

export default function DeclarationFdfpPage() {
  return (
    <LogipaieCrudPage
      title="Déclaration FDFP"
      description="Déclarations FDFP par période."
      queryKey={['logipaie-declaration-fdfp']}
      queryFn={() => logipaieService.getDeclarationsFiscales({ pageSize: 200 })}
      columns={[
        { key: 'periode', label: 'Période' },
        { key: 'matricule', label: 'Matricule' },
        { key: 'salaireImposable', label: 'Salaire imposable', align: 'right' },
        { key: 'totalImpots', label: 'Total impôts', align: 'right' },
        { key: 'statut', label: 'Statut' },
      ]}
      emptyLabel="Aucune déclaration FDFP disponible."
    />
  );
}
