'use client';

import { useQuery } from '@tanstack/react-query';
import { logipaieService } from '@/shared/api/hr';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';
import { Spinner } from '@/components/ui/spinner';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import { buildColumnsFromLabels, buildRowFromValues } from '@/components/hr/logipaie/logipaieColumns';

export default function LivrePaieAnnuelPage() {
  const livreQuery = useQuery({
    queryKey: ['logipaie-livre-paie-annuel'],
    queryFn: () => logipaieService.getLivresPaieAnnuels({ pageSize: 200 }),
  });

  const rows = livreQuery.data?.data ?? [];
  const labels = LOGIPAIE_SHEETS['29-LIVRE DE PAIE ANNUEL'];
  const columns = buildColumnsFromLabels(labels);
  const pick = (row: any, keys: string[]) =>
    keys.find((key) => row?.[key] !== undefined && row?.[key] !== null)
      ? row[keys.find((key) => row?.[key] !== undefined && row?.[key] !== null)!]
      : null;

  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="Livre de paie annuel"
        description="Synthèse annuelle de la paie."
      />

      {livreQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable
          columns={columns}
          rows={rows.map((row: any) =>
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
                row.brutExonereEmploye,
                row.brutExonereEmployeur,
              ],
              labels,
              row.id
            )
          )}
          emptyLabel="Aucun livre de paie annuel disponible."
        />
      )}
    </div>
  );
}
