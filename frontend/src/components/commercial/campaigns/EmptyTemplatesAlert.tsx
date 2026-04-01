import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus } from 'lucide-react';

interface EmptyTemplatesAlertProps {
  onAction?: () => void;
}

export function EmptyTemplatesAlert({ onAction }: EmptyTemplatesAlertProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        Aucun modèle d'email n'est disponible
      </div>
      <p className="text-xs text-orange-800">
        Créez un modèle pour activer l'envoi des campagnes. Vous pourrez ensuite le sélectionner
        dans le formulaire.
      </p>
      {onAction && (
        <Button type="button" variant="outline" size="sm" onClick={onAction} className="w-fit">
          <Plus className="mr-2 h-4 w-4" />
          Créer un modèle
        </Button>
      )}
    </div>
  );
}
