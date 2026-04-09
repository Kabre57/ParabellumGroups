import { useQuery } from '@tanstack/react-query';
import billingService from '@/shared/api/billing';

type Period = 'month' | 'quarter' | 'year' | 'all';

export function useSpendingOverview(
  range: { startDate?: string; endDate?: string },
  enabled = true
) {
  return useQuery({
    queryKey: ['billing-spending-overview', range.startDate, range.endDate],
    queryFn: () => billingService.getSpendingOverview(range),
    enabled,
  });
}

export function usePurchaseCommitments(enabled = true) {
  return useQuery({
    queryKey: ['billing-purchase-commitments'],
    queryFn: () => billingService.getPurchaseCommitments(),
    enabled,
  });
}

export function useEncaissements(params?: any, enabled = true) {
  return useQuery({
    queryKey: ['billing-encaissements', params],
    queryFn: () => billingService.getEncaissements(params),
    enabled,
  });
}

export function useDecaissements(params?: any, enabled = true) {
  return useQuery({
    queryKey: ['billing-decaissements', params],
    queryFn: () => billingService.getDecaissements(params),
    enabled,
  });
}

export function useFacturesFournisseurs(enabled = true) {
  return useQuery({
    queryKey: ['billing-factures-fournisseurs'],
    queryFn: () => billingService.getFacturesFournisseurs(),
    enabled,
  });
}
