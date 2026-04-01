import { Input } from '@/components/ui/input';
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

export function SequenceBuilder({ steps, templates, onChange }: SequenceBuilderProps) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-3">
      <div className="text-sm font-medium">Séquence de relance</div>
      <div className="mt-1 text-xs text-muted-foreground">
        L&apos;étape 1 utilise le modèle principal. Ajoutez des relances email, appels ou visites terrain.
      </div>
      <div className="mt-3 grid gap-3">
        {steps.map((step) => (
          <div key={step.step} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_120px_72px]">
            <div>
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
                <option value="">
                  {step.channel === 'EMAIL' ? 'Aucun' : 'Non requis'}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.nom}
                  </option>
                ))}
              </select>
            </div>
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
            <div className="flex items-end text-xs text-muted-foreground">J+{step.delayDays || '0'}</div>
            <div className="md:col-span-4">
              <label className="block text-xs font-medium mb-1">Instruction</label>
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
        ))}
      </div>
    </div>
  );
}
