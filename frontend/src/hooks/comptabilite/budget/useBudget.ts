import { useQuery } from '@tanstack/react-query';
import billingService from '@/shared/api/billing';

export function useBudget(year: number, scope?: { enterpriseId?: string | number; enterpriseScope?: 'consolidated'; isReady?: boolean }) {
  return useQuery({
    queryKey: ['billing-budget-performance', year, scope?.enterpriseId ?? scope?.enterpriseScope ?? 'active'],
    queryFn: () => billingService.getBudgetPerformance(year, scope),
    enabled: scope?.isReady ?? true,
  });
}
