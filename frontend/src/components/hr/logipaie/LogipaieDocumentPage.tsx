'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogipaiePageHeader } from './LogipaiePageHeader';
import { Spinner } from '@/components/ui/spinner';
import { LogipaieDocumentPreview } from './LogipaieDocumentPreview';
import PrintLayout from '@/components/printComponents/PrintLayout';

type DocumentRow = { label: string; value?: string | number | null };
type DocumentSection = { title?: string; rows: DocumentRow[] };

type Props = {
  title: string;
  description?: string;
  queryKey: string[];
  queryFn: () => Promise<any>;
  buildSections: (record: any) => DocumentSection[];
  buildMeta?: (record: any) => string;
  buildSubtitle?: (record: any) => string;
  emptyLabel?: string;
  table?: (record: any, list: any[]) => { headers: string[]; rows: (string | number | null)[][] };
};

export function LogipaieDocumentPage({
  title,
  description,
  queryKey,
  queryFn,
  buildSections,
  buildMeta,
  buildSubtitle,
  emptyLabel = 'Aucune donnée disponible.',
  table,
}: Props) {
  const query = useQuery({ queryKey, queryFn });
  const { record, list } = useMemo(() => {
    const data = query.data?.data ?? query.data ?? [];
    const listData = Array.isArray(data) ? data : [data];
    return { record: listData[0], list: listData };
  }, [query.data]);
  const [printOpen, setPrintOpen] = useState(false);

  const sections = record ? buildSections(record) : [];
  const meta = record && buildMeta ? buildMeta(record) : undefined;
  const subtitle = record && buildSubtitle ? buildSubtitle(record) : undefined;
  const tableContent = record && table ? table(record, list) : undefined;

  return (
    <div className="space-y-6">
      <LogipaiePageHeader title={title} description={description} />

      {query.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : record ? (
        <>
          <LogipaieDocumentPreview
            title={title}
            subtitle={subtitle}
            meta={meta}
            sections={sections}
            table={tableContent}
            onPrint={() => setPrintOpen(true)}
          />

          {printOpen && (
            <PrintLayout
              title={title}
              subtitle={subtitle}
              meta={meta}
              onClose={() => setPrintOpen(false)}
            >
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <div key={index}>
                    {section.title && (
                      <div className="section-title">{section.title}</div>
                    )}
                    <table className="table-print">
                      <tbody>
                        {section.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            <td style={{ width: '40%' }}>{row.label}</td>
                            <td>{row.value ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {tableContent && (
                  <table className="table-print">
                    <thead>
                      <tr>
                        {tableContent.headers.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableContent.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell ?? '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </PrintLayout>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
