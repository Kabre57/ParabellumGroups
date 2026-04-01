import { useQuery } from '@tanstack/react-query';
import type { CampagneTemplate } from '@/shared/api/communication';
import { communicationService } from '@/shared/api/communication';

export const useTemplates = () => {
  const templatesQuery = useQuery<CampagneTemplate[]>({
    queryKey: ['email-templates'],
    queryFn: () => communicationService.getTemplates(),
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error as Error | null,
    refetch: templatesQuery.refetch,
  };
};
