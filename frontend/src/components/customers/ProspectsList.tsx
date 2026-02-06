'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commercialService } from '@/shared/api/commercial';
import type { Prospect, ProspectStage } from '@/shared/api/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const PROSPECT_STAGES: Array<{ id: ProspectStage; label: string; color: string }> = [
  { id: 'preparation', label: 'Preparation', color: 'bg-gray-100 text-gray-800' },
  { id: 'research', label: 'Recherche', color: 'bg-blue-100 text-blue-800' },
  { id: 'contact', label: 'Contact', color: 'bg-purple-100 text-purple-800' },
  { id: 'discovery', label: 'Decouverte', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'proposal', label: 'Proposition', color: 'bg-orange-100 text-orange-800' },
  { id: 'won', label: 'Gagne', color: 'bg-green-100 text-green-800' },
  { id: 'lost', label: 'Perdu', color: 'bg-red-100 text-red-800' },
];

interface ProspectsListProps {
  onConvert?: (prospect: Prospect) => void;
}

export default function ProspectsList({ onConvert }: ProspectsListProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const response = await commercialService.getProspects();
      return response.data;
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => commercialService.convertProspect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const handleConvert = (prospect: Prospect) => {
    if (confirm(`Convertir "${prospect.companyName}" en client ?`)) {
      convertMutation.mutate(prospect.id);
      onConvert?.(prospect);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  const prospects = (data?.data || []) as Prospect[];

  const prospectsByStage = PROSPECT_STAGES.reduce((acc, stage) => {
    acc[stage.id] = prospects.filter((p: Prospect) => p.stage === stage.id);
    return acc;
  }, {} as Record<ProspectStage, Prospect[]>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {PROSPECT_STAGES.map((stage) => (
        <div key={stage.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              {stage.label}
            </h3>
            <Badge variant="outline" className="text-xs">
              {prospectsByStage[stage.id]?.length || 0}
            </Badge>
          </div>

          <div className="space-y-2">
            {prospectsByStage[stage.id]?.length > 0 ? (
              prospectsByStage[stage.id].map((prospect) => (
                <Card key={prospect.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                      {prospect.companyName}
                    </h4>

                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>{prospect.contactName}</p>
                      {prospect.email && <p>{prospect.email}</p>}
                      {prospect.phone && <p>{prospect.phone}</p>}
                    </div>

                    {prospect.potentialValue && (
                      <div className="text-xs font-semibold text-green-600">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(prospect.potentialValue)}
                      </div>
                    )}

                    {prospect.closingProbability && (
                      <div className="text-xs text-gray-500">
                        Probabilite: {prospect.closingProbability}%
                      </div>
                    )}

                    {prospect.source && (
                      <Badge variant="outline" className="text-xs">
                        {prospect.source}
                      </Badge>
                    )}

                    {stage.id === 'won' && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleConvert(prospect)}
                        disabled={convertMutation.isPending}
                      >
                        Convertir en client
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                Aucun prospect
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
