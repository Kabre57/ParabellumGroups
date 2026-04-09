'use client';

import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface PlacementsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function PlacementsFilters({ search, onSearchChange }: PlacementsFiltersProps) {
  return (
    <Card className="p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un placement, un émetteur ou un type..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </Card>
  );
}
