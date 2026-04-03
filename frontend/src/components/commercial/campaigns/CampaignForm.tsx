import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UseFormReturn } from 'react-hook-form';
import type { CampagneTemplate } from '@/shared/api/communication';
import type {
  CampaignFormValues,
  SequenceStepForm,
  CampaignStopConditions,
} from '@/types/campaigns';
import { OBJECTIF_OPTIONS, SEGMENT_OPTIONS, STATUS_OPTIONS } from '@/types/campaigns';
import { SequenceBuilder } from './SequenceBuilder';
import { EmptyTemplatesAlert } from './EmptyTemplatesAlert';

interface CampaignFormProps {
  form: UseFormReturn<CampaignFormValues>;
  templates: CampagneTemplate[];
  selectedTemplate?: CampagneTemplate;
  sequenceSteps: SequenceStepForm[];
  onSequenceChange: (steps: SequenceStepForm[]) => void;
  stopConditions: CampaignStopConditions;
  onStopConditionsChange: (next: CampaignStopConditions) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CampaignFormValues) => void;
  onCreateTemplate?: () => void;
  submitLabel: string;
}

export function CampaignForm({
  form,
  templates,
  selectedTemplate,
  sequenceSteps,
  onSequenceChange,
  stopConditions,
  onStopConditionsChange,
  isSubmitting,
  onCancel,
  onSubmit,
  onCreateTemplate,
  submitLabel,
}: CampaignFormProps) {
  const variablesText = useMemo(() => {
    if (!selectedTemplate?.variables) return '';
    if (Array.isArray(selectedTemplate.variables)) {
      return selectedTemplate.variables.join(', ');
    }
    if (typeof selectedTemplate.variables === 'object') {
      return Object.keys(selectedTemplate.variables).join(', ');
    }
    return String(selectedTemplate.variables);
  }, [selectedTemplate]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <Input {...form.register('nom', { required: true })} placeholder="Relance prospects Q2" />
          {form.formState.errors.nom && <p className="text-xs text-red-600">Nom requis</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Objectif *</label>
          <select className="w-full px-3 py-2 border rounded-md" {...form.register('objectif', { required: true })}>
            {OBJECTIF_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Segment cible *</label>
          <select className="w-full px-3 py-2 border rounded-md" {...form.register('segment', { required: true })}>
            {SEGMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium">Modèle d'email *</label>
            {onCreateTemplate ? (
              <Button type="button" variant="outline" size="sm" onClick={onCreateTemplate}>
                Créer un modèle
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Obligatoire : l&apos;email J+0 utilise ce modèle principal.
          </p>
          {templates.length === 0 && <EmptyTemplatesAlert onAction={onCreateTemplate} />}
          <select
            className="w-full px-3 py-2 border rounded-md"
            {...form.register('templateId', { required: true })}
            disabled={templates.length === 0}
          >
            <option value="">
              {templates.length === 0 ? 'Aucun modèle disponible' : 'Sélectionner un modèle'}
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.nom}
              </option>
            ))}
          </select>
          {selectedTemplate?.sujet && (
            <p className="text-xs text-muted-foreground">Sujet: {selectedTemplate.sujet}</p>
          )}
          {variablesText && (
            <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Variables disponibles: {variablesText}
            </div>
          )}
          {form.formState.errors.templateId && (
            <p className="text-xs text-red-600">Modèle requis</p>
          )}
        </div>

        <div className="md:col-span-2">
          <SequenceBuilder steps={sequenceSteps} templates={templates} onChange={onSequenceChange} />
        </div>

        <div className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stopConditions.stopOnReply}
              onChange={(event) =>
                onStopConditionsChange({ ...stopConditions, stopOnReply: event.target.checked })
              }
            />
            Arrêter si le prospect répond
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stopConditions.stopOnSigned}
              onChange={(event) =>
                onStopConditionsChange({ ...stopConditions, stopOnSigned: event.target.checked })
              }
            />
            Arrêter si le devis est signé
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Statut</label>
          <select className="w-full px-3 py-2 border rounded-md" {...form.register('status')}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date d'envoi</label>
          <Input type="datetime-local" {...form.register('dateEnvoi')} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Destinataires (un email par ligne)</label>
          <textarea
            className="w-full px-3 py-2 border rounded-md min-h-[120px]"
            placeholder="exemple@client.com"
            {...form.register('destinatairesText')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
