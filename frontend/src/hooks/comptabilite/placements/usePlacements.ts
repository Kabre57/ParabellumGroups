import { useQuery } from '@tanstack/react-query';
import billingService from '@/shared/api/billing';

export function usePlacements(params?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: ['billing-placements', params],
    queryFn: () => billingService.getPlacements(params),
  });
}

export function usePlacementsPerformance() {
  return useQuery({
    queryKey: ['billing-placements-performance'],
    queryFn: () => billingService.getPlacementsPerformance(),
  });
}
