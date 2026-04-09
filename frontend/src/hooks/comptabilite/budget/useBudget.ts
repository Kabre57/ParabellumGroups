import { useQuery } from '@tanstack/react-query';
import billingService from '@/shared/api/billing';

export function useBudget(year: number) {
  return useQuery({
    queryKey: ['billing-budget-performance', year],
    queryFn: () => billingService.getBudgetPerformance(year),
  });
}
