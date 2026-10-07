import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import billingService from '@/shared/api/billing';

export function useEcritures(enabled = true, scope?: { enterpriseId?: string | number; enterpriseScope?: 'consolidated' }) {
  return useQuery({
    queryKey: ['accounting-entries', scope?.enterpriseId ?? scope?.enterpriseScope ?? 'active'],
    queryFn: () => billingService.getAccountingEntries(scope),
    enabled,
  });
}

export function useAccountsForEntry(scope?: { enterpriseId?: string | number; enterpriseScope?: 'consolidated' }, enabled = true) {
  return useQuery({
    queryKey: ['billing-accounting-accounts', scope?.enterpriseId ?? scope?.enterpriseScope ?? 'active'],
    queryFn: () => billingService.getAccountingAccounts(scope),
    enabled,
  });
}

export function useCreateEntry(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.createAccountingEntry,
    onSuccess: () => {
      toast.success('Écriture comptable créée avec succès.');
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-general-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-balance-v2'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erreur lors de la création de l'écriture.");
    },
  });
}
