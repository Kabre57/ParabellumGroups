'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';

type PrintColumn = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
};

type PrintRow = Record<string, string | number | null | undefined>;

interface TabularListPrintProps {
  title: string;
  subtitle?: string;
  companyName?: string;
  serviceName?: string | null;
  logoSrc?: string | null;
  columns: PrintColumn[];
  rows: PrintRow[];
  summary?: Array<{ label: string; value: string | number }>;
  orientation?: 'portrait' | 'landscape';
  onClose: () => void;
}

export default function TabularListPrint({
  title,
  subtitle,
  companyName,
  serviceName,
  logoSrc,
  columns,
  rows,
  summary = [],
  orientation = 'landscape',
  onClose,
}: TabularListPrintProps) {
  const {
    companyName: enterpriseName,
    logoSrc: enterpriseLogoSrc,
  } = useEnterpriseLogo();
  const effectiveCompanyName = companyName || enterpriseName;
  const resolvedLogo = resolvePrintLogo(logoSrc || enterpriseLogoSrc);

  return (
    <PrintLayout
      title={title}
      orientation={orientation}
      onClose={onClose}
      hideDefaultHeader
      showFooter={false}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={resolvedLogo}
            alt={effectiveCompanyName}
            style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8 }}
            onError={(e) => {
              e.currentTarget.src = '/parabellum.jpg';
            }}
          />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{effectiveCompanyName}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{textOrDash(serviceName)}</div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{subtitle}</div>}
          <div style={{ fontSize: 11, marginTop: 8 }}>Édité le {formatPrintDate(new Date(), true)}</div>
        </div>
      </div>

      {summary.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(summary.length, 4)}, minmax(0, 1fr))`,
            gap: 12,
            marginBottom: 16,
          }}
        >
          {summary.map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid #cbd5e1',
                padding: 10,
                background: '#f8fafc',
              }}
            >
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{textOrDash(item.value)}</div>
            </div>
          ))}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  border: '1px solid #243b5f',
                  background: '#d7e4f5',
                  padding: '8px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  textAlign: column.align || 'left',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    border: '1px solid #243b5f',
                    padding: '8px 6px',
                    fontSize: 11,
                    textAlign: column.align || 'left',
                  }}
                >
                  {textOrDash(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  border: '1px solid #243b5f',
                  padding: 18,
                  fontSize: 11,
                  textAlign: 'center',
                }}
              >
                Aucune donnée à imprimer.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </PrintLayout>
  );
}
