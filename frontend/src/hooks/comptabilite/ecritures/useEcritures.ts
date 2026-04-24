import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import billingService from '@/shared/api/billing';

export function useEcritures(enabled = true, enterpriseId?: string) {
  return useQuery({
    queryKey: ['accounting-entries', enterpriseId || 'all'],
    queryFn: () =>
      billingService.getAccountingOverview('all', enterpriseId ? { enterpriseId } : undefined),
    enabled,
  });
}

export function useAccountsForEntry(enabled = true) {
  return useQuery({
    queryKey: ['billing-accounting-accounts'],
    queryFn: () => billingService.getAccountingAccounts(),
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
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erreur lors de la création de l'écriture.");
    },
  });
}
