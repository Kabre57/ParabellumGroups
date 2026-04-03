'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { formatFCFA, formatFCFAInWords, formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
import type { CashVoucher } from '@/shared/api/billing';

interface CashVoucherPrintProps {
  voucher: CashVoucher;
  onClose: () => void;
  companyName?: string;
  logoSrc?: string | null;
}

export default function CashVoucherPrint({
  voucher,
  onClose,
  companyName = 'Parabellum Groups',
  logoSrc,
}: CashVoucherPrintProps) {
  const resolvedLogo = resolvePrintLogo(logoSrc);
  const isEncaissement = voucher.flowType === 'ENCAISSEMENT';
  const encaissementBox = isEncaissement ? '☑' : '☐';
  const decaissementBox = !isEncaissement ? '☑' : '☐';

  return (
    <PrintLayout title="Bon de caisse" onClose={onClose} hideDefaultHeader>
      <div className="print-sheet">
        <div className="print-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <img
                src={resolvedLogo}
                alt={companyName}
                className="print-logo"
                style={{ width: 54, height: 54, objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.src = '/parabellum.jpg';
                }}
              />
              <div>
                <div className="print-title">{companyName}</div>
                <div className="print-subtitle">{textOrDash(voucher.serviceName)}</div>
              </div>
            </div>
            <div className="print-meta" style={{ minWidth: 180 }}>
              <div>Bon de caisse N° {textOrDash(voucher.voucherNumber)}</div>
              <div>Abidjan, le {formatPrintDate(voucher.issueDate)}</div>
            </div>
          </div>

          <div className="text-center" style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
            BON DE CAISSE
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12, fontSize: 12 }}>
            <div>{encaissementBox} Encaissement</div>
            <div>{decaissementBox} Décaissement</div>
          </div>

          <table className="table-print" style={{ marginBottom: 14 }}>
            <tbody>
              <tr>
                <th style={{ width: '24%' }}>Versant / Bénéficiaire</th>
                <td style={{ width: '26%' }}>{textOrDash(voucher.beneficiaryName)}</td>
                <th style={{ width: '24%' }}>Motif</th>
                <td>{textOrDash(voucher.description)}</td>
              </tr>
              <tr>
                <th>Prénom</th>
                <td>{textOrDash('-')}</td>
                <th>Montant total</th>
                <td style={{ fontWeight: 700 }}>{formatFCFA(voucher.amountTTC)}</td>
              </tr>
              <tr>
                <th>Téléphone</th>
                <td>{textOrDash(voucher.beneficiaryPhone)}</td>
                <th>Référence</th>
                <td>{textOrDash(voucher.reference)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ border: '1px solid #000', padding: 8, marginBottom: 14, fontSize: 12 }}>
            Arrêté le présent Bon de Caisse à la somme de :
            <div style={{ fontWeight: 700, marginTop: 6 }}>{formatFCFAInWords(voucher.amountTTC)}</div>
          </div>

          <table className="table-print">
            <tbody>
              <tr>
                <th className="text-center" style={{ width: '33%' }}>Signature du bénéficiaire</th>
                <th className="text-center" style={{ width: '33%' }}>Signature de la Direction</th>
                <th className="text-center" style={{ width: '34%' }}>Signature Caisse</th>
              </tr>
              <tr>
                <td style={{ height: 80 }}></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PrintLayout>
  );
}
