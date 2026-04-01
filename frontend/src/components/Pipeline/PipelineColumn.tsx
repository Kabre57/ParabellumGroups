'use client';

import { ReactNode } from 'react';

interface PipelineColumnProps {
  title: string;
  count: number;
  onDrop: (opportunityId: string) => void;
  children: ReactNode;
}

export function PipelineColumn({ title, count, onDrop, children }: PipelineColumnProps) {
  return (
    <div
      className="flex flex-col rounded-xl border bg-muted/20 p-4 min-h-[240px]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const opportunityId = event.dataTransfer.getData('text/plain');
        if (opportunityId) {
          onDrop(opportunityId);
        }
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs rounded-full bg-muted px-2 py-1">{count}</span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
