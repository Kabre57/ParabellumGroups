'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { OpportunityFormValues, PipelineOpportunity } from './types';
import { ETAPE_OPTIONS, STATUT_OPTIONS } from './types';

interface OpportunityModalProps {
  open: boolean;
  mode: 'view' | 'edit';
  opportunity: PipelineOpportunity | null;
  onClose: () => void;
  onSubmit?: (values: OpportunityFormValues) => Promise<void> | void;
}

const toInputDate = (value?: string) => {
  if (!value) return '';
  return value.length >= 16 ? value.slice(0, 16) : value;
};

export function OpportunityModal({
  open,
  mode,
  opportunity,
  onClose,
  onSubmit,
}: OpportunityModalProps) {
  const form = useForm<OpportunityFormValues>({
    defaultValues: {
      nom: '',
      description: '',
      montantEstime: 0,
      probabilite: 0,
      dateFermetureEstimee: '',
      etape: 'PROSPECTION',
      statut: 'OUVERTE',
    },
  });

  useEffect(() => {
    if (!opportunity) return;
    form.reset({
      nom: opportunity.title,
      description: opportunity.description || '',
      montantEstime: opportunity.value,
      probabilite: opportunity.probability,
      dateFermetureEstimee: toInputDate(opportunity.expectedCloseDate),
      etape: opportunity.etape || 'PROSPECTION',
      statut: opportunity.statut || 'OUVERTE',
    });
  }, [opportunity, form]);

  if (!opportunity) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'view' ? 'Detail opportunite' : 'Modifier opportunite'}</DialogTitle>
          <DialogDescription>
            {mode === 'view' ? 'Informations principales' : 'Mettez a jour les informations commerciales.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'view' ? (
          <div className="space-y-2 text-sm">
            <div><strong>Nom:</strong> {opportunity.title}</div>
            <div><strong>Client:</strong> {opportunity.company}</div>
            <div><strong>Montant:</strong> {opportunity.value}</div>
            <div><strong>Probabilite:</strong> {opportunity.probability}%</div>
            <div><strong>Etape:</strong> {opportunity.etape || '-'}</div>
            <div><strong>Statut:</strong> {opportunity.statut || '-'}</div>
            <div><strong>Fermeture estimee:</strong> {opportunity.expectedCloseDate}</div>
            <div><strong>Description:</strong> {opportunity.description || '-'}</div>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(async (values) => {
              if (onSubmit) {
                await onSubmit(values);
              }
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <Input {...form.register('nom', { required: true })} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Montant estime</label>
                <Input type="number" min={0} {...form.register('montantEstime', { valueAsNumber: true })} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Probabilite</label>
                <Input type="number" min={0} max={100} {...form.register('probabilite', { valueAsNumber: true })} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Etape</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('etape')}>
                  {ETAPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select className="w-full px-3 py-2 border rounded-md" {...form.register('statut')}>
                  {STATUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fermeture estimee</label>
                <Input type="datetime-local" {...form.register('dateFermetureEstimee')} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded-md" {...form.register('description')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit">Mettre a jour</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
