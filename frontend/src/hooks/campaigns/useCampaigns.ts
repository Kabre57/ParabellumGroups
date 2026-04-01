import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CampagneMail, CampagneStatus } from '@/shared/api/communication';
import { communicationService } from '@/shared/api/communication';

export const useCampaigns = (statusFilter: 'all' | CampagneStatus) => {
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery<CampagneMail[]>({
    queryKey: ['email-campaigns', statusFilter],
    queryFn: () =>
      communicationService.getCampaigns(
        statusFilter === 'all' ? undefined : { status: statusFilter }
      ),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof communicationService.createCampaign>[0]) =>
      communicationService.createCampaign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CampagneMail> }) =>
      communicationService.updateCampaign(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communicationService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });

  return {
    campaigns: campaignsQuery.data || [],
    isLoading: campaignsQuery.isLoading,
    error: campaignsQuery.error as Error | null,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
