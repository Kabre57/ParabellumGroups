import { RhFilterConfig } from '@/types/rh';

export function PersonnelFilters({ filters }: { filters: RhFilterConfig[] }) {
  return (
    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
      Filtres personnel ({filters.length}) à configurer.
    </div>
  );
}
