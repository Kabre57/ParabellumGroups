import { useQuery } from '@tanstack/react-query';
import billingService from '@/shared/api/billing';

export function useRapports(period: 'month' | 'quarter' | 'year', enabled = true) {
  return useQuery({
    queryKey: ['billing-accounting-reports', period],
    queryFn: () => billingService.getAccountingOverview(period),
    enabled,
  });
}
