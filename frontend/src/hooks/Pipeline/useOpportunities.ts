import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opportunitesService } from '@/shared/api/crm/opportunites.service';
import type { Opportunite } from '@/shared/api/crm/types';
import type { OpportunityFormValues, PipelineStage } from '@/components/Pipeline/types';

interface UseOpportunitiesOptions {
  clientStatus?: string;
  limit?: number;
}

export const useOpportunities = (options: UseOpportunitiesOptions = {}) => {
  const queryClient = useQueryClient();
  const limit = options.limit ?? 200;

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunites', options.clientStatus || 'all'],
    queryFn: () =>
      opportunitesService.getOpportunites({
        limit,
        clientStatus: options.clientStatus,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OpportunityFormValues }) =>
      opportunitesService.updateOpportunite(id, {
        nom: data.nom,
        description: data.description || undefined,
        montantEstime: Number(data.montantEstime) || 0,
        probabilite: Number(data.probabilite) || 0,
        dateFermetureEstimee: data.dateFermetureEstimee || undefined,
        etape: data.etape,
        statut: data.statut,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => opportunitesService.deleteOpportunite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, etape }: { id: string; etape: PipelineStage }) =>
      opportunitesService.updateStage(id, {
        etape,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: 'GAGNEE' | 'PERDUE' }) =>
      opportunitesService.closeOpportunite(id, {
        statut,
        raisonPerdue: statut === 'PERDUE' ? 'Perdu via pipeline' : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  const opportunities =
    opportunitiesQuery.data?.data ||
    (opportunitiesQuery.data as any)?.data?.data ||
    [];

  return {
    opportunities: opportunities as Opportunite[],
    isLoading: opportunitiesQuery.isLoading,
    error: opportunitiesQuery.error as Error | null,
    updateMutation,
    deleteMutation,
    updateStageMutation,
    closeMutation,
  };
};
