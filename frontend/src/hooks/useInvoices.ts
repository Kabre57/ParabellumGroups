import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService, Invoice } from '@/shared/api/billing';

export function useInvoices(params?: Record<string, any>) {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const response = await billingService.getInvoices(params);
      return response.data;
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingService.getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof billingService.createInvoice>[0]) =>
      billingService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) =>
      billingService.updateInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => billingService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => billingService.getInvoiceStats(),
  });
}
