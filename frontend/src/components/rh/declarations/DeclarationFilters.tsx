import { RhFilterConfig } from '@/types/rh';

export function DeclarationFilters({ filters }: { filters: RhFilterConfig[] }) {
  return (
    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
      Filtres déclarations ({filters.length}) à configurer.
    </div>
  );
}
