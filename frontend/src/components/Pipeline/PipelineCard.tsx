'use client';

import { Badge } from '@/components/ui/badge';
import type { PipelineOpportunity } from './types';

interface PipelineCardProps {
  opportunity: PipelineOpportunity;
  onView?: (opportunity: PipelineOpportunity) => void;
  onEdit?: (opportunity: PipelineOpportunity) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  })
    .format(value)
    .replace('XOF', 'F CFA');

export function PipelineCard({ opportunity, onView, onEdit }: PipelineCardProps) {
  return (
    <div
      className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', opportunity.id);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{opportunity.title}</p>
          <p className="text-xs text-muted-foreground">{opportunity.company}</p>
        </div>
        <Badge variant="outline">{opportunity.probability}%</Badge>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(opportunity.value)}</span>
        <span>{opportunity.etape || opportunity.statut || '-'}</span>
      </div>

      {(onView || onEdit) && (
        <div className="mt-3 flex gap-2">
          {onView && (
            <button
              type="button"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
              onClick={() => onView(opportunity)}
            >
              Voir
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className="text-xs font-medium text-gray-600 hover:text-gray-800"
              onClick={() => onEdit(opportunity)}
            >
              Modifier
            </button>
          )}
        </div>
      )}
    </div>
  );
}
