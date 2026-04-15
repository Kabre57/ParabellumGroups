'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { formatFCFA, formatFCFAInWords, formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';
import type { Encaissement, Decaissement } from '@/shared/api/billing';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';

interface CashVoucherPrintProps {
  voucher: (Encaissement | Decaissement) & { flowType?: 'ENCAISSEMENT' | 'DECAISSEMENT' };
  onClose: () => void;
  companyName?: string;
  logoSrc?: string | null;
}

export default function CashVoucherPrint({
  voucher,
  onClose,
  companyName = 'PROGI-TECK',
  logoSrc,
}: CashVoucherPrintProps) {
  const resolvedLogo = resolvePrintLogo(logoSrc);
  const isEncaissement = voucher.flowType === 'ENCAISSEMENT' || ('clientName' in voucher);
  const voucherNumber = 'numeroPiece' in voucher ? voucher.numeroPiece : (voucher as any).voucherNumber;
  const issueDate = 'dateEncaissement' in voucher ? voucher.dateEncaissement : ('dateDecaissement' in voucher ? voucher.dateDecaissement : (voucher as any).issueDate);
  
  const fullName = ('clientName' in voucher ? voucher.clientName : ('beneficiaryName' in voucher ? voucher.beneficiaryName : '')) || '';
  const firstName = fullName.split(' ')[0] || '-';
  const lastName = fullName.split(' ').slice(1).join(' ') || '-';
  const nomComplet = `${firstName} ${lastName}`.trim();
  const beneficiaryPhone = (voucher as any).beneficiaryPhone || (voucher as any).clientPhone || '-';

  const renderVoucher = (label: string) => (
    <div className="voucher-container" style={{ padding: '20px', border: '1px dashed #ccc', marginBottom: '40px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 5, right: 10, fontSize: 10, color: '#999', fontWeight: 'bold' }}>{label}</div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
        <div>
          {resolvedLogo && (
            <img
              src={resolvedLogo}
              alt={effectiveCompanyName}
              style={{ width: 45, height: 45, objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.src = '/parabellum.jpg'; }}
            />
          )}
        </div>
        
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{effectiveCompanyName}</div>
          <div style={{ fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>BON DE CAISSE</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>N° {textOrDash(voucherNumber)}</div>
        </div>
        
        <div style={{ width: 45 }}></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, fontSize: 11 }}>
        <div>
          <span style={{ marginRight: 12 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '1px solid #000', marginRight: 4, textAlign: 'center', lineHeight: '10px', fontSize: 10 }}>
              {isEncaissement ? '✓' : ''}
            </span>
            Encaissement
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '1px solid #000', marginRight: 4, textAlign: 'center', lineHeight: '10px', fontSize: 10 }}>
              {!isEncaissement ? '✓' : ''}
            </span>
            Décaissement
          </span>
        </div>
        <div>Le {formatPrintDate(issueDate)}</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15 }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', padding: '0 4px 6px 0' }}>
              <div style={{ border: '1px solid #000', minHeight: 60 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', fontSize: 10 }}>
                  NOM & PRENOM
                </div>
                <div style={{ padding: '6px 8px', fontSize: 11 }}>{textOrDash(nomComplet)}</div>
              </div>
            </td>
            <td style={{ width: '50%', padding: '0 0 6px 4px' }}>
              <div style={{ border: '1px solid #000', minHeight: 60 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', fontSize: 10 }}>
                  N° TELEPHONE
                </div>
                <div style={{ padding: '6px 8px', fontSize: 11 }}>{textOrDash(beneficiaryPhone)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style={{ width: '50%', padding: '4px 4px 0 0' }}>
              <div style={{ border: '1px solid #000', minHeight: 50 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', fontSize: 10 }}>
                  MOTIF
                </div>
                <div style={{ padding: '6px 8px', fontSize: 11 }}>{textOrDash(voucher.description)}</div>
              </div>
            </td>
            <td style={{ width: '50%', padding: '4px 0 0 4px' }}>
              <div style={{ border: '1px solid #000', minHeight: 50 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', backgroundColor: '#f5f5f5', fontSize: 10 }}>
                  MONTANT TOTAL
                </div>
                <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 'bold' }}>{formatFCFA(voucher.amountTTC)}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ border: '1px solid #000', padding: '8px', marginBottom: 15, fontSize: 10 }}>
        Arrêté le présent Bon de Caisse à la somme de :
        <div style={{ fontWeight: 'bold', marginTop: 4, fontSize: 11 }}>{formatFCFAInWords(voucher.amountTTC)}</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '33%', fontWeight: 'bold', fontSize: 9, backgroundColor: '#f5f5f5' }}>Bénéficiaire</td>
            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '33%', fontWeight: 'bold', fontSize: 9, backgroundColor: '#f5f5f5' }}>Direction</td>
            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '34%', fontWeight: 'bold', fontSize: 9, backgroundColor: '#f5f5f5' }}>Comptabilité / Caisse</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', height: 60 }}></td>
            <td style={{ border: '1px solid #000', height: 60 }}></td>
            <td style={{ border: '1px solid #000', height: 60 }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <PrintLayout title="Bon de caisse" onClose={onClose} hideDefaultHeader showFooter={false}>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            .print-sheet {
              width: 190mm;
              margin: 0 auto;
            }
          }
        `}
      </style>
      
      <div className="print-sheet">
        {renderVoucher('EXEMPLAIRE SOUCHE')}
        
        <div style={{ height: '20px', borderBottom: '1px dashed #444', marginBottom: '40px', textAlign: 'center' }}>
          <span style={{ backgroundColor: 'white', padding: '0 10px', fontSize: 10, color: '#666', position: 'relative', top: '10px' }}>DÉCOUPER ICI</span>
        </div>

        {renderVoucher('EXEMPLAIRE BÉNÉFICIAIRE')}
      </div>
    </PrintLayout>
  );
}
