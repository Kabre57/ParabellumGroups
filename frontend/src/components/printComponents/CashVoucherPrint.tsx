'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { formatFCFA, formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
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

  return (
    <PrintLayout title="Bon de caisse" onClose={onClose} hideDefaultHeader>
      <div>
        <div className="print-header">
          <div className="flex items-center" style={{ gap: 12 }}>
            <img
              src={resolvedLogo}
              alt={companyName}
              className="print-logo"
              style={{ width: 56, height: 56, objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/parabellum.jpg';
              }}
            />
            <div>
              <div className="print-title">{companyName}</div>
              <div className="print-subtitle">{textOrDash(voucher.serviceName)}</div>
            </div>
          </div>
          <div className="print-meta">
            <div>Bon de caisse: {textOrDash(voucher.voucherNumber)}</div>
            <div>Date d&apos;émission: {formatPrintDate(voucher.issueDate)}</div>
            <div>Statut: {textOrDash(voucher.status)}</div>
          </div>
        </div>

        <table className="table-print" style={{ marginBottom: 16 }}>
          <tbody>
            <tr>
              <th>Origine</th>
              <td>{textOrDash(voucher.sourceType)}</td>
              <th>Référence source</th>
              <td>{textOrDash(voucher.sourceNumber)}</td>
            </tr>
            <tr>
              <th>Bénéficiaire</th>
              <td>{textOrDash(voucher.beneficiaryName)}</td>
              <th>Fournisseur</th>
              <td>{textOrDash(voucher.supplierName)}</td>
            </tr>
            <tr>
              <th>Mode</th>
              <td>{voucher.paymentMethod === 'CHEQUE' ? 'Chèque' : voucher.paymentMethod === 'ESPECES' ? 'Espèces' : voucher.paymentMethod}</td>
              <th>Référence paiement</th>
              <td>{textOrDash(voucher.reference)}</td>
            </tr>
          </tbody>
        </table>

        <table className="table-print" style={{ marginBottom: 18 }}>
          <thead>
            <tr>
              <th style={{ width: '8%' }}>Ligne</th>
              <th style={{ width: '26%' }}>Rubrique</th>
              <th>Description</th>
              <th style={{ width: '16%' }}>Montant</th>
              <th style={{ width: '12%' }}>Mode</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>{textOrDash(voucher.expenseCategory || 'Décaissement')}</td>
              <td>{textOrDash(voucher.description)}</td>
              <td>{formatFCFA(voucher.amountHT)}</td>
              <td>{voucher.paymentMethod === 'CHEQUE' ? 'Chèque' : voucher.paymentMethod === 'ESPECES' ? 'Espèces' : voucher.paymentMethod}</td>
            </tr>
            <tr>
              <td>2</td>
              <td>TVA</td>
              <td>Taxe appliquée sur le décaissement</td>
              <td>{formatFCFA(voucher.amountTVA)}</td>
              <td>-</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Total TTC</td>
              <td>Montant total à décaisser</td>
              <td>{formatFCFA(voucher.amountTTC)}</td>
              <td>{voucher.paymentMethod === 'CHEQUE' ? 'Chèque' : voucher.paymentMethod === 'ESPECES' ? 'Espèces' : voucher.paymentMethod}</td>
            </tr>
          </tbody>
        </table>

        {voucher.notes && (
          <div className="print-footer">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Notes</div>
            <div>{voucher.notes}</div>
          </div>
        )}
      </div>
    </PrintLayout>
  );
}
