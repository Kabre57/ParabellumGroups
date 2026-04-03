'use client';

import type { ReactNode } from 'react';

type Column = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: Record<string, any>) => ReactNode;
};

const alignClass = (align?: Column['align']) => {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
};

export function LogipaieTable({
  columns,
  rows,
  emptyLabel = 'Aucune donnée disponible.',
}: {
  columns: Column[];
  rows: Record<string, any>[];
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-muted/60">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-2 ${alignClass(col.align)}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={row.id ?? rowIndex} className="border-b last:border-0">
                {columns.map((col) => {
                  const rawValue = row[col.key];
                  const value = col.format ? col.format(rawValue, row) : rawValue;
                  return (
                    <td key={col.key} className={`px-3 py-2 ${alignClass(col.align)} align-top`}>
                      {value ?? '-'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
