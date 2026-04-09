'use client';

import { useState } from 'react';
import type { Placement } from '@/shared/api/billing';

import { usePlacements, usePlacementsPerformance } from '@/hooks/comptabilite/placements/usePlacements';
import { useCreatePlacement, useAddAssetCourse } from '@/hooks/comptabilite/placements/usePlacementMutations';
import { usePlacementFilters } from '@/hooks/comptabilite/placements/usePlacementFilters';

import {
  PlacementsHeader,
  PlacementsStats,
  PlacementsChart,
  PlacementsFilters,
  PlacementsTable,
  CreatePlacementDialog,
  AddCourseDialog,
} from '@/components/comptabilite/placements';

import type { CreatePlacementPayload } from '@/types/comptabilite/placements';

export default function PlacementsPage() {
  // ─── UI State ───────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);

  // ─── Data ────────────────────────────────────────────────────
  const { data, isLoading } = usePlacements();
  const { data: performanceData, isLoading: isPerfLoading } = usePlacementsPerformance();

  const placements = data?.data || [];
  const summary = data?.summary || {
    totalInvested: 0,
    currentValuation: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
  };
  const history = (performanceData?.data || []) as any[];

  // ─── Filters ─────────────────────────────────────────────────
  const { search, setSearch, filtered } = usePlacementFilters(placements);

  // ─── Mutations ───────────────────────────────────────────────
  const createMutation = useCreatePlacement(() => setIsCreateOpen(false));

  const courseMutation = useAddAssetCourse(() => {
    setIsCourseOpen(false);
    setSelectedPlacement(null);
  });

  // ─── Handlers ────────────────────────────────────────────────
  const handleAddCourse = (placement: Placement) => {
    setSelectedPlacement(placement);
    setIsCourseOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <PlacementsHeader onNewPlacement={() => setIsCreateOpen(true)} />

      {/* KPIs */}
      <PlacementsStats summary={summary} count={placements.length} />

      {/* Graphique */}
      <PlacementsChart history={history} isLoading={isPerfLoading} />

      {/* Filtre */}
      <PlacementsFilters search={search} onSearchChange={setSearch} />

      {/* Tableau */}
      <PlacementsTable
        placements={filtered}
        isLoading={isLoading}
        onAddCourse={handleAddCourse}
      />

      {/* Dialog : Création */}
      <CreatePlacementDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data: CreatePlacementPayload) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {/* Dialog : Saisie cours */}
      <AddCourseDialog
        open={isCourseOpen}
        onOpenChange={setIsCourseOpen}
        placement={selectedPlacement}
        onSubmit={(id, value, atDate) => courseMutation.mutate({ id, value, atDate })}
        isPending={courseMutation.isPending}
      />
    </div>
  );
}
