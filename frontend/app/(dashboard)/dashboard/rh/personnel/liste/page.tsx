'use client';

import { hrService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function PersonnelListePage() {
  const labels = LOGIPAIE_SHEETS['5-LE PERSONNEL'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Personnel - Liste"
      description="Liste du personnel (matricule, identité, contacts, statut)."
      queryKey={['logipaie-personnel-liste']}
      queryFn={() => hrService.getEmployees({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((emp: any) =>
          buildRowFromValues(
            [
              emp.matricule || emp.id,
              emp.civilite,
              emp.nomComplet || `${emp.nom ?? ''} ${emp.prenoms ?? ''}`.trim(),
              emp.sexe,
              emp.dateNaissance,
              emp.lieuNaissance,
              emp.naturePieceIdentite,
              emp.numeroPieceIdentite,
              emp.nationalite,
              emp.codeNationalite,
              emp.situationMatrimoniale,
              emp.nombreEnfants,
              emp.nombrePartsIgr,
              emp.adressePersonnelle,
              emp.telephonePersonnel,
              emp.lieuHabitation,
              emp.contrat,
              emp.dateSignatureContrat,
              emp.dureeCddMois,
              emp.dateEntree ?? emp.dateCreation,
              emp.dateSortie,
              emp.direction,
              emp.service,
              emp.emploi,
              emp.codeEmploi,
              emp.regime,
              emp.typeEmploi,
              emp.categorie,
              emp.nonSoumisCnps ? 'X' : '',
              emp.numeroCnps,
              emp.modePaiement,
              emp.rib,
              emp.banque,
            ],
            labels,
            emp.matricule || emp.id
          )
        )
      }
      emptyLabel="Aucun personnel enregistré."
    />
  );
}
