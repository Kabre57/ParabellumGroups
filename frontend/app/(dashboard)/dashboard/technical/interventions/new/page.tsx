'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCreateIntervention } from '@/hooks/useTechnical';
import { InterventionForm } from '@/components/technical/InterventionForm';
import { Intervention } from '@/shared/api/services/technical';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewInterventionPage() {
  const router = useRouter();
  const createMutation = useCreateIntervention();

  const handleSubmit = (data: Partial<Intervention>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        router.push('/dashboard/technical/interventions');
      },
      onError: (error) => {
        console.error('Erreur lors de la création de l\'intervention:', error);
        alert('Erreur lors de la création de l\'intervention. Veuillez réessayer.');
      }
    });
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/technical/interventions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux interventions
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouvelle Intervention</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Créer une nouvelle intervention technique
          </p>
        </div>
      </div>

      <InterventionForm
        onSubmit={handleSubmit}
        onClose={handleClose}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
