'use client';

import { PipelineColumn } from './PipelineColumn';
import { PipelineCard } from './PipelineCard';
import type { PipelineColumnId, PipelineOpportunity } from './types';
import { PIPELINE_COLUMNS } from './types';

interface PipelineKanbanProps {
  opportunities: PipelineOpportunity[];
  onStageChange: (opportunityId: string, target: PipelineColumnId) => void;
  onView?: (opportunity: PipelineOpportunity) => void;
  onEdit?: (opportunity: PipelineOpportunity) => void;
}

const isStatusColumn = (column: PipelineColumnId) => column === 'GAGNEE' || column === 'PERDUE';

export function PipelineKanban({ opportunities, onStageChange, onView, onEdit }: PipelineKanbanProps) {
  const getOpportunitiesForColumn = (column: PipelineColumnId) => {
    if (isStatusColumn(column)) {
      return opportunities.filter((opportunity) => opportunity.statut === column);
    }
    return opportunities.filter((opportunity) => opportunity.etape === column && opportunity.statut !== 'GAGNEE' && opportunity.statut !== 'PERDUE');
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PIPELINE_COLUMNS.map((column) => {
        const columnOpportunities = getOpportunitiesForColumn(column.id);
        return (
          <PipelineColumn
            key={column.id}
            title={column.label}
            count={columnOpportunities.length}
            onDrop={(opportunityId) => onStageChange(opportunityId, column.id)}
          >
            {columnOpportunities.length === 0 ? (
              <div className="rounded-md border border-dashed bg-white p-4 text-xs text-muted-foreground text-center">
                Aucune opportunite
              </div>
            ) : (
              columnOpportunities.map((opportunity) => (
                <PipelineCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onView={onView}
                  onEdit={onEdit}
                />
              ))
            )}
          </PipelineColumn>
        );
      })}
    </div>
  );
}
