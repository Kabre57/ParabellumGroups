'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlacementsHeaderProps {
  onNewPlacement: () => void;
}

export function PlacementsHeader({ onNewPlacement }: PlacementsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold">Gestion des Placements</h1>
        <p className="mt-2 text-muted-foreground">
          Suivi des actifs financiers, actions, obligations et placements immobiliers du groupe.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onNewPlacement} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Placement
        </Button>
      </div>
    </div>
  );
}
