'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogipaiePageHeader } from './LogipaiePageHeader';
import { LogipaieTable } from './LogipaieTable';
import { Spinner } from '@/components/ui/spinner';

type Column = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: Record<string, any>) => ReactNode;
};

type Props = {
  title: string;
  description?: string;
  queryKey: string[];
  queryFn: () => Promise<any>;
  columns: Column[];
  mapRows?: (rows: any[]) => Record<string, any>[];
  emptyLabel?: string;
};

export function LogipaieCrudPage({
  title,
  description,
  queryKey,
  queryFn,
  columns,
  mapRows,
  emptyLabel,
}: Props) {
  const query = useQuery({ queryKey, queryFn });
  const rows = useMemo(() => {
    const data = query.data?.data ?? query.data ?? [];
    return mapRows ? mapRows(data) : data;
  }, [query.data, mapRows]);

  return (
    <div className="space-y-6">
      <LogipaiePageHeader title={title} description={description} />

      {query.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable columns={columns} rows={rows} emptyLabel={emptyLabel} />
      )}
    </div>
  );
}
