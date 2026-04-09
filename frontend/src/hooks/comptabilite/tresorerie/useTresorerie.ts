import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import billingService from '@/shared/api/billing';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';

export function useTresorerieFlows(
  period: Period,
  customRange: { startDate?: string; endDate?: string } | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['cash-flows', period, customRange?.startDate ?? null, customRange?.endDate ?? null],
    queryFn: () => billingService.getAccountingOverview(period, customRange || undefined),
    enabled,
  });
}

export function useTreasuryClosures(
  periodRange: { startDate?: string; endDate?: string } | null,
  period: Period,
  customRange: any,
  enabled = true
) {
  return useQuery({
    queryKey: ['treasury-closures', periodRange?.startDate ?? null, periodRange?.endDate ?? null],
    queryFn: () =>
      billingService.getTreasuryClosures({
        startDate: periodRange?.startDate,
        endDate: periodRange?.endDate,
        period: customRange ? undefined : period,
      }),
    enabled,
  });
}

export function useCreateTreasuryAccount(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.createTreasuryAccount,
    onSuccess: () => {
      toast.success('Compte de trésorerie créé.');
      queryClient.invalidateQueries({ queryKey: ['cash-flows'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible de créer le compte.');
    },
  });
}

export function useCreateClosure(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.createTreasuryClosure,
    onSuccess: () => {
      toast.success('Clôture enregistrée.');
      queryClient.invalidateQueries({ queryKey: ['treasury-closures'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible de créer la clôture.');
    },
  });
}

export function useValidateClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.validateTreasuryClosure,
    onSuccess: () => {
      toast.success('Clôture validée.');
      queryClient.invalidateQueries({ queryKey: ['treasury-closures'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible de valider la clôture.');
    },
  });
}
