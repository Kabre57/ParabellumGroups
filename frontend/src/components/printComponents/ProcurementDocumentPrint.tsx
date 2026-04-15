'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { formatFCFA, formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';

type ProcurementRecipient = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type ProcurementLine = {
  imageUrl?: string | null;
  designation: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  vatRate?: number | null;
  totalHT?: number | null;
  totalTTC?: number | null;
};

interface ProcurementDocumentPrintProps {
  documentLabel: string;
  documentNumber: string;
  serviceName?: string | null;
  companyName?: string;
  issueDate?: string | null;
  issuedBy?: string | null;
  deliveryLeadTime?: string | null;
  deliveryMode?: string | null;
  paymentTerms?: string | null;
  recipient?: ProcurementRecipient;
  lines: ProcurementLine[];
  notes?: string | null;
  signatureLabel?: string;
  footerNote?: string | null;
  onClose: () => void;
}

const boxTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 8,
  textTransform: 'uppercase',
};

const tableHeaderCellStyle: React.CSSProperties = {
  border: '1px solid #243b5f',
  background: '#d7e4f5',
  padding: '8px 6px',
  fontSize: 11,
  fontWeight: 700,
  textAlign: 'center',
};

const tableBodyCellStyle: React.CSSProperties = {
  border: '1px solid #243b5f',
  padding: '8px 6px',
  fontSize: 11,
  verticalAlign: 'top',
};

export default function ProcurementDocumentPrint({
  documentLabel,
  documentNumber,
  serviceName,
  companyName,
  issueDate,
  issuedBy,
  deliveryLeadTime,
  deliveryMode,
  paymentTerms,
  recipient,
  lines,
  notes,
  signatureLabel = 'Signature',
  footerNote,
  onClose,
}: ProcurementDocumentPrintProps) {
  const { companyName: enterpriseName, logoSrc: enterpriseLogo } = useEnterpriseLogo();
  const effectiveCompanyName = companyName || enterpriseName;
  const minimumVisualRows = 8;
  const enrichedLines = lines.map((line) => {
    const totalHT = line.totalHT ?? line.unitPrice * line.quantity;
    const vatRate = Number(line.vatRate ?? 0);
    const totalTTC = line.totalTTC ?? totalHT * (1 + vatRate / 100);

    return {
      ...line,
      vatRate,
      totalHT,
      totalTTC,
    };
  });

  const subtotalHT = enrichedLines.reduce((sum, line) => sum + line.totalHT, 0);
  const totalVAT = enrichedLines.reduce((sum, line) => sum + (line.totalTTC - line.totalHT), 0);
  const totalTTC = enrichedLines.reduce((sum, line) => sum + line.totalTTC, 0);
  const logoSrc = resolvePrintLogo(enterpriseLogo);
  const producerLabel = textOrDash(issuedBy || effectiveCompanyName);
  const blankRowCount = Math.max(0, minimumVisualRows - enrichedLines.length);
  const fillerHeightMm = blankRowCount > 0 ? Math.max(36, blankRowCount * 16) : 0;
  const recipientLines = [
    recipient?.email?.trim(),
    recipient?.phone?.trim(),
    recipient?.address?.trim(),
  ].filter(Boolean) as string[];

  const metaRows = [
    { label: 'Date d’émission', value: formatPrintDate(issueDate) },
    { label: 'Émis par', value: producerLabel },
    { label: 'Délai de livraison', value: textOrDash(deliveryLeadTime) },
    { label: 'Mode de livraison', value: textOrDash(deliveryMode) },
    { label: 'Modalité de paiement', value: textOrDash(paymentTerms) },
  ];

  return (
    <PrintLayout
      title={documentLabel}
      onClose={onClose}
      hideDefaultHeader
      showFooter={false}
    >
      <div
        style={{
          minHeight: '255mm',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <img
                src={logoSrc}
                alt={effectiveCompanyName}
                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8 }}
                onError={(e) => {
                  e.currentTarget.src = '/parabellum.jpg';
                }}
              />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                  {textOrDash(effectiveCompanyName)}
                </div>
                {serviceName ? (
                  <div style={{ fontSize: 12, color: '#475569' }}>{textOrDash(serviceName)}</div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, textAlign: 'right', alignSelf: 'flex-end' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{documentLabel}</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>{documentNumber}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 18, marginBottom: 14 }}>
          <div
            style={{
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              padding: 12,
            }}
          >
            <div style={boxTitleStyle}>Informations d’émission</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {metaRows.map((row) => (
                  <tr key={row.label}>
                    <td style={{ padding: '4px 8px 4px 0', fontSize: 11, fontWeight: 600, width: '42%' }}>
                      {row.label}
                    </td>
                    <td style={{ padding: '4px 0', fontSize: 11 }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              border: '1px solid #cbd5e1',
              padding: 12,
            }}
          >
            <div style={boxTitleStyle}>Destinataire</div>
            <div style={{ fontSize: 12, lineHeight: 1.55 }}>
              <div style={{ fontWeight: 700 }}>{textOrDash(recipient?.name)}</div>
              {recipientLines.length > 0 ? (
                recipientLines.map((line, index) => (
                  <div key={`${line}-${index}`} style={{ whiteSpace: 'pre-wrap' }}>
                    {line}
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b' }}>Compléter la fiche fournisseur pour afficher ses coordonnées.</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderCellStyle, width: '9%' }}>Image</th>
                <th style={{ ...tableHeaderCellStyle, width: '28%' }}>Désignation des produits ou prestations</th>
                <th style={{ ...tableHeaderCellStyle, width: '9%' }}>Quantité</th>
                <th style={{ ...tableHeaderCellStyle, width: '8%' }}>Unité</th>
                <th style={{ ...tableHeaderCellStyle, width: '17%' }}>Prix unitaire HT</th>
                <th style={{ ...tableHeaderCellStyle, width: '8%' }}>TVA applicable</th>
                <th style={{ ...tableHeaderCellStyle, width: '21%' }}>TOTAL HT</th>
              </tr>
            </thead>
            <tbody>
              {enrichedLines.map((line, index) => (
                <tr key={`${line.designation}-${index}`}>
                  <td style={{ ...tableBodyCellStyle, textAlign: 'center' }}>
                    {line.imageUrl ? (
                      <img
                        src={line.imageUrl}
                        alt={line.designation}
                        style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }}
                      />
                    ) : (
                      <div style={{ fontSize: 9, color: '#64748b' }}>Sans image</div>
                    )}
                  </td>
                  <td style={tableBodyCellStyle}>{textOrDash(line.designation)}</td>
                  <td style={{ ...tableBodyCellStyle, textAlign: 'center' }}>{textOrDash(line.quantity)}</td>
                  <td style={{ ...tableBodyCellStyle, textAlign: 'center' }}>{textOrDash(line.unit)}</td>
                  <td style={{ ...tableBodyCellStyle, textAlign: 'right' }}>{formatFCFA(line.unitPrice)}</td>
                  <td style={{ ...tableBodyCellStyle, textAlign: 'center' }}>{`${line.vatRate}%`}</td>
                  <td style={{ ...tableBodyCellStyle, textAlign: 'right' }}>{formatFCFA(line.totalHT)}</td>
                </tr>
              ))}
              {enrichedLines.length === 0 && (
                <tr>
                  <td style={{ ...tableBodyCellStyle, height: `${Math.max(fillerHeightMm, 96)}mm` }} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                </tr>
              )}
              {enrichedLines.length > 0 && fillerHeightMm > 0 && (
                <tr>
                  <td style={{ ...tableBodyCellStyle, height: `${fillerHeightMm}mm` }} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                  <td style={tableBodyCellStyle} />
                </tr>
              )}
            </tbody>
          </table>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 0.9fr',
              gap: 24,
              alignItems: 'stretch',
              marginTop: 'auto',
              borderTop: '1px solid #243b5f',
              paddingTop: 12,
              minHeight: 120,
            }}
          >
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {footerNote && <div style={{ marginBottom: 14 }}>{footerNote}</div>}
                {notes && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Observations</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{notes}</div>
                  </>
                )}
              </div>
              <div style={{ fontWeight: 700, paddingTop: 28 }}>{signatureLabel}</div>
            </div>

            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', fontSize: 12, fontWeight: 700 }}>Total HT</td>
                    <td style={{ padding: '4px 0', fontSize: 12, textAlign: 'right' }}>{formatFCFA(subtotalHT)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontSize: 12, fontWeight: 700 }}>TVA</td>
                    <td style={{ padding: '4px 0', fontSize: 12, textAlign: 'right' }}>{formatFCFA(totalVAT)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontSize: 12, fontWeight: 700 }}>Frais de port</td>
                    <td style={{ padding: '4px 0', fontSize: 12, textAlign: 'right' }}>{formatFCFA(0)}</td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '10px 0 0',
                        fontSize: 18,
                        fontWeight: 800,
                        borderTop: '2px solid #0f172a',
                      }}
                    >
                      Total TTC
                    </td>
                    <td
                      style={{
                        padding: '10px 0 0',
                        fontSize: 18,
                        fontWeight: 800,
                        textAlign: 'right',
                        borderTop: '2px solid #0f172a',
                      }}
                    >
                      {formatFCFA(totalTTC)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}
