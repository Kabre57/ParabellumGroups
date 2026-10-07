import { useQuery } from '@tanstack/react-query';
import billingService from '@/shared/api/billing';

export function useRapports(period: 'month' | 'quarter' | 'year', scope?: { enterpriseId?: string | number; enterpriseScope?: 'consolidated' }, enabled = true) {
  return useQuery({
    queryKey: ['billing-accounting-reports', period, scope?.enterpriseId ?? scope?.enterpriseScope ?? 'active'],
    queryFn: () => billingService.getAccountingOverview(period, scope),
    enabled,
  });
}
