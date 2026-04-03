'use client';

import { useQuery } from '@tanstack/react-query';
import { logipaieService } from '@/shared/api/hr';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';
import { Spinner } from '@/components/ui/spinner';
import { LOGIPAIE_SHEETS } from '@/components/hr/logipaie/logipaieLabels';
import { buildColumnsFromLabels, buildRowFromValues } from '@/components/hr/logipaie/logipaieColumns';

export default function Note27BPage() {
  const statsQuery = useQuery({
    queryKey: ['logipaie-note-27b'],
    queryFn: () => logipaieService.getStatistiquesRh({ pageSize: 200 }),
  });

  const rows = statsQuery.data?.data ?? [];
  const labels = LOGIPAIE_SHEETS['39-NOTE 27B'];
  const columns = buildColumnsFromLabels(labels);
  const pick = (row: any, keys: string[]) =>
    keys.find((key) => row?.[key] !== undefined && row?.[key] !== null)
      ? row[keys.find((key) => row?.[key] !== undefined && row?.[key] !== null)!]
      : null;

  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="NOTE 27B"
        description="Effectifs, masse salariale et personnel extérieur."
      />

      {statsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable
          columns={columns}
          rows={rows.map((row: any) =>
            buildRowFromValues(
              [
                row.qualification ?? row.categorie ?? row.intitule ?? '-',
                pick(row, ['effectifNationaux', 'hommes', 'effectif']),
                pick(row, ['effectifRegion', 'femmes', 'effectifRegionaux']),
                pick(row, ['effectifHorsRegion', 'hommesSaisonniers', 'effectifExternes']),
                pick(row, ['effectifTotal', 'femmesSaisonniers', 'effectifTotal']),
                pick(row, ['masseSalarialeNationaux', 'hommesMasseSalariale']),
                pick(row, ['masseSalarialeRegion', 'femmesMasseSalariale']),
                pick(row, ['masseSalarialeHorsRegion', 'hommesTotal']),
                pick(row, ['masseSalarialeTotal', 'femmesTotal']),
              ],
              labels,
              row.id
            )
          )}
          emptyLabel="Aucune donnée NOTE 27B disponible."
        />
      )}
    </div>
  );
}
