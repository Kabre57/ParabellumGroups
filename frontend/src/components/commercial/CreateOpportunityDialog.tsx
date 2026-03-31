'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/hooks/useCrm';
import { crmService } from '@/shared/api/crm';
import type { Client } from '@/shared/api/crm/types';

interface OpportunityFormValues {
  clientId: string;
  nom: string;
  description?: string;
  montantEstime: string;
  probabilite: string;
  dateFermetureEstimee?: string;
  etape: 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'FINALISATION';
  statut: 'OUVERTE' | 'GAGNEE' | 'PERDUE' | 'MISE_EN_ATTENTE';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const defaultValues: OpportunityFormValues = {
  clientId: '',
  nom: '',
  description: '',
  montantEstime: '',
  probabilite: '50',
  dateFermetureEstimee: '',
  etape: 'PROSPECTION',
  statut: 'OUVERTE',
};

export function CreateOpportunityDialog({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClients({ pageSize: 200 }, { enabled: isOpen });

  const form = useForm<OpportunityFormValues>({
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof crmService.createOpportunite>[0]) =>
      crmService.createOpportunite(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunites'] });
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  const clientsArray: Client[] = Array.isArray(clients) ? clients : [];

  const handleClose = () => {
    if (createMutation.isPending) return;
    form.reset(defaultValues);
    onClose();
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      clientId: values.clientId,
      nom: values.nom,
      description: values.description || undefined,
      montantEstime: Number(values.montantEstime) || 0,
      probabilite: Number(values.probabilite) || 0,
      dateFermetureEstimee: values.dateFermetureEstimee || undefined,
      etape: values.etape,
      statut: values.statut,
    });

    handleClose();
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouvelle opportunite</DialogTitle>
          <DialogDescription>
            Cree un nouveau dossier dans le pipeline commercial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Client</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('clientId', { required: true })}
              >
                <option value="">Selectionner un client</option>
                {clientsArray.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom || client.raisonSociale || client.reference || 'Client'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Nom de l'opportunite</label>
              <Input {...form.register('nom', { required: true })} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Montant estime</label>
              <Input type="number" min="0" {...form.register('montantEstime', { required: true })} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Probabilite (%)</label>
              <Input type="number" min="0" max="100" {...form.register('probabilite')} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Etape</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('etape')}
              >
                <option value="PROSPECTION">Prospection</option>
                <option value="QUALIFICATION">Qualification</option>
                <option value="PROPOSITION">Proposition</option>
                <option value="NEGOCIATION">Negociation</option>
                <option value="FINALISATION">Finalisation</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Statut</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('statut')}
              >
                <option value="OUVERTE">Ouverte</option>
                <option value="MISE_EN_ATTENTE">Mise en attente</option>
                <option value="GAGNEE">Gagnee</option>
                <option value="PERDUE">Perdue</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Fermeture estimee</label>
              <Input type="date" {...form.register('dateFermetureEstimee')} />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('description')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Creer l'opportunite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
