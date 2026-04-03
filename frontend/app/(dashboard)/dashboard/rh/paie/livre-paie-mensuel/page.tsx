'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import {
  buildColumnsFromLabels,
  buildRowFromValues,
} from '@/components/hr/logipaie/logipaieColumns';

export default function LivrePaieMensuelPage() {
  const labels = LOGIPAIE_SHEETS['21-LIVRE DE PAIE MENSUEL'];
  const columns = buildColumnsFromLabels(labels);
  const pick = (row: any, keys: string[]) =>
    keys.find((key) => row?.[key] !== undefined && row?.[key] !== null)
      ? row[keys.find((key) => row?.[key] !== undefined && row?.[key] !== null)!]
      : null;

  return (
    <LogipaieCrudPage
      title="Livre de paie mensuel"
      description="Synthèse mensuelle de la paie."
      queryKey={['logipaie-livre-mensuel']}
      queryFn={() => logipaieService.getLivresPaieMensuels({ pageSize: 200 })}
      columns={columns}
      mapRows={(rows) =>
        rows.map((row: any) =>
          buildRowFromValues(
            [
              row.matricule,
              row.nomComplet,
              row.joursTravailles,
              pick(row, ['salaire', 'salaireBase', 'salaireBaseMensuel']),
              pick(row, ['primesIndemnitesImposables', 'primesImposables']),
              row.gratification,
              row.conge,
              row.preavis,
              pick(row, ['brutFiscalSalarie', 'brutFiscal']),
              pick(row, ['primesIndemnitesNonImposables', 'primesNonImposables']),
              pick(row, ['brutFiscalEmployeur', 'brutFiscalEmployer']),
              pick(row, ['autresIndemnitesNonImposables']),
              pick(row, ['brutSocial']),
              pick(row, ['transportNonImposable']),
              pick(row, ['indemnitesNonTaxables']),
              pick(row, ['totalGains']),
              pick(row, ['totalRetenues']),
              pick(row, ['arrondis']),
              pick(row, ['totalSalaireNet', 'netAPayer']),
              row.local,
              row.expatrie,
              row.agricole,
              row.fermage,
              row.total,
              row.journaliersInf3462,
              row.journaliersSup3462,
              row.mensuelsInf75000,
              row.mensuels75000a3375000,
              row.mensuelsSup3375000,
              row.totalTranches,
              row.igrAgricole,
              row.brutEmployeur,
            ],
            labels,
            row.id
          )
        )
      }
      emptyLabel="Aucun livre de paie mensuel disponible."
    />
  );
}
