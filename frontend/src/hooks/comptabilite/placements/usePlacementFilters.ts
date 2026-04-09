import { useMemo, useState } from 'react';
import type { Placement } from '@/shared/api/billing';
import { typeLabels } from '@/utils/comptabilite/placements/formatters';

export function usePlacementFilters(placements: Placement[]) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return placements;
    return placements.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.issuer?.toLowerCase().includes(query) ||
        typeLabels[p.type]?.toLowerCase().includes(query)
    );
  }, [placements, search]);

  return { search, setSearch, filtered };
}
