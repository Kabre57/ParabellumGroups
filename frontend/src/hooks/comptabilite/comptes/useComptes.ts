import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import billingService from '@/shared/api/billing';

export function useComptes(enabled = true) {
  return useQuery({
    queryKey: ['billing-accounting-overview', 'all'],
    queryFn: () => billingService.getAccountingOverview('all'),
    enabled,
  });
}

export function useCreateCompte(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingService.createAccountingAccount,
    onSuccess: () => {
      toast.success('Compte comptable créé avec succès.');
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du compte.');
    },
  });
}

export function useUpdateCompte(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) =>
      billingService.updateAccountingAccount(id, values),
    onSuccess: () => {
      toast.success('Compte comptable mis à jour.');
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour.');
    },
  });
}

export function useDeleteCompte(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billingService.deleteAccountingAccount(id),
    onSuccess: (response) => {
      toast.success(response?.message || 'Compte comptable supprimé.');
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-overview'] });
      queryClient.invalidateQueries({ queryKey: ['billing-accounting-accounts'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression du compte.');
    },
  });
}
