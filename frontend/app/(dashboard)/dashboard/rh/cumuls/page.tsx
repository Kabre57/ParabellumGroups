'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function RhCumulsPage() {
  const labels = LOGIPAIE_SHEETS['4-CUMULS'];
  const columns = buildColumnsFromLabels(labels);

  return (
    <LogipaieCrudPage
      title="Cumuls annuels"
      description="Suivi des cumuls brut/net/CNPS/impôts."
      queryKey={['logipaie-cumuls-annuels']}
      queryFn={() => logipaieService.getCumulsAnnuels({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((row: any) =>
          buildRowFromValues(
            [
              row.nomComplet,
              row.sexe,
              row.dateNaissance,
              row.nationalite,
              row.codeNationalite,
              row.situationMatrimoniale,
              row.nombreEnfants,
              row.nombrePartsIgr,
              row.adressePersonnelle,
              row.telephonePersonnel,
              row.dateEntree,
              row.dateSortie,
              row.direction,
              row.service,
              row.emploi,
              row.codeEmploi,
              row.regime,
              row.typeEmploi,
              row.categorie,
              row.numeroCnps,
              row.cumulBrut,
              row.primesIndemnitesImposables,
              row.gratification,
              row.conge,
              row.preavis,
              row.cumulBrut,
              row.primesIndemnitesNonImposables,
              row.brutFiscalEmployeur,
              row.autresIndemnitesNonImposables,
              row.brutSocial,
              row.transportNonImposable,
              row.indemnitesNonTaxables,
              row.totalGains,
              row.impotIs,
              row.cumulCnps,
              row.avanceAcompte,
              row.assurance,
              row.cmu,
              row.retenuePret,
              row.retenueAutre,
              row.arrondis,
              row.cumulNet,
              row.joursTravailles,
              row.heuresTravaillees,
              row.congesPayes,
              row.nombreCongesPris,
              row.moisTravailles,
              row.joursTravaillesPlusConges,
              row.plafondSortie,
              row.totalMoisTravailles,
            ],
            labels,
            row.id
          )
        )
      }
      emptyLabel="Aucun cumul annuel enregistré."
    />
  );
}
