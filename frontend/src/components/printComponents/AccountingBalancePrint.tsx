'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';
import type { AccountingBalanceRow } from '@/shared/api/billing';

interface AccountingBalancePrintProps {
  rows: AccountingBalanceRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    debit: number;
    credit: number;
    balanceDebit: number;
    balanceCredit: number;
  };
  companyName?: string;
  logoSrc?: string | null;
  scopeLabel: string;
  groupBy: 'consolidated' | 'enterprise';
  startDate?: string | null;
  endDate?: string | null;
  generatedAt?: string | null;
  onClose: () => void;
}

const amountStyle = (align = 'right'): React.CSSProperties => ({
  border: '1px solid #243b5f',
  padding: '6px 5px',
  fontSize: 10,
  textAlign: align as React.CSSProperties['textAlign'],
  verticalAlign: 'top',
});

const formatAmount = (value?: number | null) =>
  `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))} F CFA`;

export default function AccountingBalancePrint({
  rows,
  totals,
  companyName,
  logoSrc,
  scopeLabel,
  groupBy,
  startDate,
  endDate,
  generatedAt,
  onClose,
}: AccountingBalancePrintProps) {
  const { companyName: fallbackCompanyName, logoSrc: fallbackLogoSrc } = useEnterpriseLogo();
  const effectiveCompanyName = companyName || fallbackCompanyName;
  const effectiveLogo = resolvePrintLogo(logoSrc || fallbackLogoSrc);
  const showEnterpriseColumn = groupBy === 'enterprise';

  return (
    <PrintLayout title="Balance des comptes" orientation="landscape" onClose={onClose} hideDefaultHeader showFooter={false}>
      <div style={{ minHeight: '180mm', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <img
                src={effectiveLogo}
                alt={effectiveCompanyName}
                style={{ width: 54, height: 54, objectFit: 'contain', borderRadius: 8 }}
                onError={(event) => {
                  event.currentTarget.src = '/parabellum.jpg';
                }}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{textOrDash(effectiveCompanyName)}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>Balance comptable détaillée</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1.2, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>Balance des comptes</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Complète</div>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                border: '1px solid #94a3b8',
                padding: '10px 12px',
                minWidth: 210,
                fontSize: 11,
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>Période du</span>
                <strong>{formatPrintDate(startDate)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>au</span>
                <strong>{formatPrintDate(endDate)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>Périmètre</span>
                <strong>{textOrDash(scopeLabel)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>Tirage</span>
                <strong>{formatPrintDate(generatedAt || new Date(), true)}</strong>
              </div>
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {showEnterpriseColumn && (
                <th rowSpan={2} style={{ ...amountStyle('left'), background: '#d7e4f5', fontWeight: 700, width: '11%' }}>
                  Entreprise
                </th>
              )}
              <th rowSpan={2} style={{ ...amountStyle('center'), background: '#d7e4f5', fontWeight: 700, width: '8%' }}>
                Numéro de compte
              </th>
              <th rowSpan={2} style={{ ...amountStyle('left'), background: '#d7e4f5', fontWeight: 700, width: showEnterpriseColumn ? '20%' : '24%' }}>
                Intitulé des comptes
              </th>
              <th colSpan={2} style={{ ...amountStyle('center'), background: '#d7e4f5', fontWeight: 700 }}>
                À-nouveaux
              </th>
              <th colSpan={2} style={{ ...amountStyle('center'), background: '#d7e4f5', fontWeight: 700 }}>
                Mouvements
              </th>
              <th colSpan={2} style={{ ...amountStyle('center'), background: '#d7e4f5', fontWeight: 700 }}>
                Soldes cumulés
              </th>
              <th rowSpan={2} style={{ ...amountStyle('center'), background: '#d7e4f5', fontWeight: 700, width: '8%' }}>
                Dernière écriture
              </th>
            </tr>
            <tr>
              <th style={{ ...amountStyle('center'), background: '#eaf1fb', fontWeight: 700, width: '9%' }}>Débit</th>
              <th style={{ ...amountStyle('center'), background: '#eaf1fb', fontWeight: 700, width: '9%' }}>Crédit</th>
              <th style={{ ...amountStyle('center'), background: '#eaf1fb', fontWeight: 700, width: '9%' }}>Débit</th>
              <th style={{ ...amountStyle('center'), background: '#eaf1fb', fontWeight: 700, width: '9%' }}>Crédit</th>
              <th style={{ ...amountStyle('center'), background: '#eaf1fb', fontWeight: 700, width: '9%' }}>Débit</th>
              <th style={{ ...amountStyle('center'), background: '#eaf1fb', fontWeight: 700, width: '9%' }}>Crédit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {showEnterpriseColumn && <td style={amountStyle('left')}>{textOrDash(row.enterpriseName)}</td>}
                <td style={amountStyle('center')}>{row.code}</td>
                <td style={amountStyle('left')}>{row.label}</td>
                <td style={amountStyle('right')}>{formatAmount(row.openingDebit)}</td>
                <td style={amountStyle('right')}>{formatAmount(row.openingCredit)}</td>
                <td style={amountStyle('right')}>{formatAmount(row.debit)}</td>
                <td style={amountStyle('right')}>{formatAmount(row.credit)}</td>
                <td style={amountStyle('right')}>{formatAmount(row.balanceDebit)}</td>
                <td style={amountStyle('right')}>{formatAmount(row.balanceCredit)}</td>
                <td style={amountStyle('center')}>{formatPrintDate(row.lastTransaction)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={showEnterpriseColumn ? 10 : 9}
                  style={{ ...amountStyle('center'), padding: '18px 8px' }}
                >
                  Aucune ligne de balance à imprimer.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                {showEnterpriseColumn && <td style={amountStyle('left')}>Totaux</td>}
                <td colSpan={showEnterpriseColumn ? 2 : 2} style={{ ...amountStyle('left'), fontWeight: 700 }}>
                  Totaux de la balance
                </td>
                <td style={{ ...amountStyle('right'), fontWeight: 700 }}>{formatAmount(totals.openingDebit)}</td>
                <td style={{ ...amountStyle('right'), fontWeight: 700 }}>{formatAmount(totals.openingCredit)}</td>
                <td style={{ ...amountStyle('right'), fontWeight: 700 }}>{formatAmount(totals.debit)}</td>
                <td style={{ ...amountStyle('right'), fontWeight: 700 }}>{formatAmount(totals.credit)}</td>
                <td style={{ ...amountStyle('right'), fontWeight: 700 }}>{formatAmount(totals.balanceDebit)}</td>
                <td style={{ ...amountStyle('right'), fontWeight: 700 }}>{formatAmount(totals.balanceCredit)}</td>
                <td style={amountStyle('center')}>-</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </PrintLayout>
  );
}
