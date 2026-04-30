'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export type CsvImportRow = Record<string, string>;

interface CsvImportSummary {
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: Array<{ row?: number; message?: string }>;
}

interface ImportCsvButtonProps {
  label?: string;
  templateLabel?: string;
  fileName: string;
  templateHeaders: string[];
  disabled?: boolean;
  onImport: (rows: CsvImportRow[]) => Promise<unknown>;
}

const detectDelimiter = (text: string) => {
  const firstLine = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0) || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
};

const parseCsv = (text: string): CsvImportRow[] => {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      row.push(cell.trim());
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== '')) {
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim()).filter(Boolean) || [];
  if (headers.length === 0) {
    return [];
  }

  return rows
    .filter((values) => values.some((value) => value !== ''))
    .map((values) =>
      headers.reduce<CsvImportRow>((acc, header, index) => {
        acc[header] = values[index]?.trim() || '';
        return acc;
      }, {})
    );
};

const escapeCsvCell = (value: string) => {
  if (/[;"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const extractSummary = (response: unknown): CsvImportSummary | null => {
  const payload = response as any;
  const summary = payload?.data?.data ?? payload?.data ?? payload;
  if (!summary || typeof summary !== 'object') return null;
  if (
    'created' in summary ||
    'updated' in summary ||
    'skipped' in summary ||
    'errors' in summary
  ) {
    return summary as CsvImportSummary;
  }
  return null;
};

const showImportToast = (summary: CsvImportSummary | null, fallbackCount: number) => {
  if (!summary) {
    toast.success(`${fallbackCount} ligne(s) importee(s)`);
    return;
  }

  const created = summary.created || 0;
  const updated = summary.updated || 0;
  const skipped = summary.skipped || 0;
  const errorCount = summary.errors?.length || 0;
  const message = `${created} cree(s), ${updated} mis a jour, ${skipped} ignore(s)`;

  if (errorCount > 0) {
    const firstError = summary.errors?.[0];
    toast.warning(`${message}. ${errorCount} erreur(s). ${firstError?.message || ''}`.trim());
    return;
  }

  toast.success(message);
};

export default function ImportCsvButton({
  label = 'Importer CSV',
  templateLabel = 'Modele CSV',
  fileName,
  templateHeaders,
  disabled,
  onImport,
}: ImportCsvButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        toast.error('Le fichier CSV ne contient aucune ligne exploitable');
        return;
      }

      const response = await onImport(rows);
      showImportToast(extractSummary(response), rows.length);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Erreur lors de l import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = `${templateHeaders.map(escapeCsvCell).join(';')}\n`;
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isImporting}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isImporting ? 'Import...' : label}
      </Button>
      <Button type="button" variant="ghost" onClick={handleDownloadTemplate} disabled={disabled || isImporting}>
        <Download className="mr-2 h-4 w-4" />
        {templateLabel}
      </Button>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
    </div>
  );
}
