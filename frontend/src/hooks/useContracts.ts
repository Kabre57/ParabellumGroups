import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService, Contract, CreateContractRequest } from '@/shared/api/hr';
import { SearchParams } from '@/shared/api/types';

export function useContracts(params?: SearchParams) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: () => hrService.getAllContracts(params),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => hrService.getContract(id),
    enabled: !!id,
  });
}

export function useEmployeeContracts(employeeId: string) {
  return useQuery({
    queryKey: ['employee-contracts', employeeId],
    queryFn: () => hrService.getContracts(employeeId),
    enabled: !!employeeId,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContractRequest) => hrService.createContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateContractRequest> }) =>
      hrService.updateContract(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => hrService.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
    },
  });
}
