import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CampagneTemplate } from '@/shared/api/communication';
import type { SequenceStepForm } from '@/types/campaigns';

interface SequenceBuilderProps {
  steps: SequenceStepForm[];
  templates: CampagneTemplate[];
  onChange: (steps: SequenceStepForm[]) => void;
}

const CHANNEL_OPTIONS: { value: SequenceStepForm['channel']; label: string }[] = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Appel' },
  { value: 'VISIT', label: 'Visite' },
];

const STATUS_OPTIONS: { value: NonNullable<SequenceStepForm['status']>; label: string }[] = [
  { value: 'A_FAIRE', label: 'A faire' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminee' },
  { value: 'ANNULEE', label: 'Annulee' },
];

export function SequenceBuilder({ steps, templates, onChange }: SequenceBuilderProps) {
  const [openStep, setOpenStep] = useState<number | null>(steps[0]?.step || null);

  const addStep = () => {
    const nextStep = Math.max(...steps.map((item) => item.step)) + 1;
    const newStep: SequenceStepForm = {
      step: nextStep,
      label: `Relance ${nextStep}`,
      channel: 'EMAIL',
      delayDays: String(nextStep * 3),
      templateId: '',
      status: 'A_FAIRE',
      note: '',
    };
    onChange([...steps, newStep]);
    setOpenStep(nextStep);
  };

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-3">
      <div className="text-sm font-medium">Séquence de relance</div>
      <div className="mt-1 text-xs text-muted-foreground">
        L&apos;étape 1 utilise le modèle principal. Ajoutez des relances email, appels ou visites terrain.
      </div>
      <div className="mt-3 space-y-2">
        {steps.map((step) => {
          const isOpen = openStep === step.step;
          const isConfigured = step.channel !== 'EMAIL' || Boolean(step.templateId);
          return (
            <div key={step.step} className="rounded-lg border bg-white">
              <button
                type="button"
                onClick={() => setOpenStep(isOpen ? null : step.step)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="text-sm font-medium">
                  {isOpen ? '▼' : '▶'} {step.label} – {CHANNEL_OPTIONS.find((opt) => opt.value === step.channel)?.label}
                  <span className="ml-2 text-xs text-muted-foreground">J+{step.delayDays || '0'}</span>
                </div>
                {isConfigured ? (
                  <Badge variant="secondary">Configurée</Badge>
                ) : (
                  <Badge variant="outline">À configurer</Badge>
                )}
              </button>
              {isOpen ? (
                <div className="grid gap-3 border-t px-4 py-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Canal</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={step.channel}
                      onChange={(event) => {
                        const value = event.target.value as SequenceStepForm['channel'];
                        onChange(
                          steps.map((item) =>
                            item.step === step.step
                              ? {
                                  ...item,
                                  channel: value,
                                  templateId: value === 'EMAIL' ? item.templateId : '',
                                }
                              : item
                          )
                        );
                      }}
                    >
                      {CHANNEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Délai (jours)</label>
                    <Input
                      type="number"
                      min="0"
                      value={step.delayDays}
                      onChange={(event) => {
                        const value = event.target.value;
                        onChange(
                          steps.map((item) =>
                            item.step === step.step ? { ...item, delayDays: value } : item
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1">{step.label} - Modèle</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={step.templateId}
                      onChange={(event) => {
                        const value = event.target.value;
                        onChange(
                          steps.map((item) =>
                            item.step === step.step ? { ...item, templateId: value } : item
                          )
                        );
                      }}
                      disabled={step.channel !== 'EMAIL'}
                    >
                      <option value="">{step.channel === 'EMAIL' ? 'Aucun' : 'Non requis'}</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Statut</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={step.status || 'A_FAIRE'}
                      onChange={(event) => {
                        const value = event.target.value as SequenceStepForm['status'];
                        onChange(
                          steps.map((item) =>
                            item.step === step.step ? { ...item, status: value } : item
                          )
                        );
                      }}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1">Instruction (optionnel)</label>
                    <Input
                      value={step.note || ''}
                      placeholder={
                        step.channel === 'PHONE'
                          ? 'Ex: Appeler le décideur et confirmer le besoin'
                          : step.channel === 'VISIT'
                          ? 'Ex: Visite terrain pour démonstration'
                          : 'Ex: Ajouter un rappel personnalisé'
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        onChange(
                          steps.map((item) =>
                            item.step === step.step ? { ...item, note: value } : item
                          )
                        );
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <Button type="button" variant="outline" onClick={addStep}>
          + Ajouter une relance
        </Button>
      </div>
    </div>
  );
}
