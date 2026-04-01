import { Input } from '@/components/ui/input';
import type { CampagneTemplate } from '@/shared/api/communication';
import type { SequenceStepForm } from '@/types/campaigns';

interface SequenceBuilderProps {
  steps: SequenceStepForm[];
  templates: CampagneTemplate[];
  onChange: (steps: SequenceStepForm[]) => void;
}

export function SequenceBuilder({ steps, templates, onChange }: SequenceBuilderProps) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-3">
      <div className="text-sm font-medium">Séquence de relance</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Email 1 part du modèle principal. Ajustez les délais et ajoutez des emails si besoin.
      </div>
      <div className="mt-3 grid gap-3">
        {steps.map((step) => (
          <div key={step.step} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_72px]">
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
              >
                <option value="">Aucun</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.nom}
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
          </div>
        ))}
      </div>
    </div>
  );
}
