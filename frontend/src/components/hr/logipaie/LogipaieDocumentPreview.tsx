'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type DocumentRow = { label: string; value?: ReactNode };
type DocumentSection = { title?: string; rows: DocumentRow[] };

export type LogipaieDocumentPreviewProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  sections: DocumentSection[];
  table?: {
    headers: string[];
    rows: ReactNode[][];
  };
  onPrint?: () => void;
};

export function LogipaieDocumentPreview({
  title,
  subtitle,
  meta,
  sections,
  table,
  onPrint,
}: LogipaieDocumentPreviewProps) {
  return (
    <div className="rounded-lg border border-muted/60 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-muted/60 px-6 py-4">
        <div>
          <div className="text-lg font-semibold text-foreground">{title}</div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="text-sm text-muted-foreground whitespace-pre-line">{meta}</div>
        {onPrint && (
          <Button onClick={onPrint} className="ml-auto">
            Imprimer
          </Button>
        )}
      </div>

      <div className="space-y-6 px-6 py-5">
        {sections.map((section, index) => (
          <div key={index}>
            {section.title && (
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {section.rows.map((row, rowIndex) => (
                <div key={rowIndex} className="text-sm">
                  <div className="text-xs text-muted-foreground">{row.label}</div>
                  <div className="font-medium text-foreground">{row.value ?? '-'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {table && (
          <div className="overflow-x-auto rounded-md border border-muted/60">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  {table.headers.map((header) => (
                    <th key={header} className="px-3 py-2 text-left font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-muted/60">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2">
                        {cell ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
