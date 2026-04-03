'use client';

import { useQuery } from '@tanstack/react-query';
import { logipaieService } from '@/shared/api/hr';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';
import { Spinner } from '@/components/ui/spinner';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import { buildColumnsFromLabels, buildRowFromValues } from '@/components/hr/logipaie/logipaieColumns';

export default function JournalPersonnelPage() {
  const journalQuery = useQuery({
    queryKey: ['logipaie-historiques-personnel'],
    queryFn: () => logipaieService.getHistoriquesEmploye({ pageSize: 200 }),
  });

  const rows = journalQuery.data?.data ?? [];
  const labels = LOGIPAIE_SHEETS['40-JOURNAL DU PERSONNEL'];
  const columns = buildColumnsFromLabels(labels);
  const dayLabels = labels.slice(2);

  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="Journal du personnel"
        description="Historique des mouvements RH: embauches, mutations, promotions, suspensions, départs."
      />

      {journalQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable
          columns={columns}
          rows={rows.map((row: any) =>
            {
              const nomComplet =
                row.employe?.nomComplet ||
                row.employe?.fullName ||
                row.employee?.fullName ||
                row.nomComplet ||
                '-';
              const values = Array(labels.length).fill(null);
              values[0] = row.id ?? row.numero ?? '';
              values[1] = nomComplet;
              const date = row.dateEvenement ?? row.date ?? row.createdAt;
              if (date) {
                const d = new Date(date);
                if (!Number.isNaN(d.getTime())) {
                  const day = d.getDate();
                  const idx = dayLabels.findIndex((label) => Number(label) === day);
                  if (idx >= 0) {
                    values[idx + 2] = row.typeMouvement ?? row.type ?? row.code ?? 'X';
                  }
                }
              }
              return buildRowFromValues(values, labels, row.id);
            }
          )}
          emptyLabel="Aucun mouvement RH enregistré."
        />
      )}
    </div>
  );
}
