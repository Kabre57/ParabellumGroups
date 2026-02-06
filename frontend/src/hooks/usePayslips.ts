import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService, Payroll, CreatePayrollRequest } from '@/shared/api/hr';
import { SearchParams } from '@/shared/api/types';

export function usePayslips(params?: SearchParams) {
  return useQuery({
    queryKey: ['payslips', params],
    queryFn: () => hrService.getPayroll(params),
  });
}

export function usePayslip(id: string) {
  return useQuery({
    queryKey: ['payslip', id],
    queryFn: () => hrService.getPayrollById(id),
    enabled: !!id,
  });
}

export function useCreatePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePayrollRequest) => hrService.createPayroll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });
}

export function useUpdatePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePayrollRequest> }) =>
      hrService.updatePayroll(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      queryClient.invalidateQueries({ queryKey: ['payslip', variables.id] });
    },
  });
}

export function useDeletePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => hrService.deletePayroll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });
}

export function useGeneratePayslip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, period }: { employeeId: string; period: string }) =>
      hrService.generatePayslip(employeeId, period),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });
}
