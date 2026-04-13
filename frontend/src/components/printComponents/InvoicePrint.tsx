 'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import type { Invoice, InvoiceItem } from '@/shared/api/billing';
import { formatFCFA, formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';

interface InvoicePrintProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoicePrint({ invoice, onClose }: InvoicePrintProps) {
  const { companyName: enterpriseName, logoSrc: enterpriseLogo } = useEnterpriseLogo();
  const normalizedItems = (invoice.lignes || []).map((item) => {
    const quantity = item.quantity ?? item.quantite ?? 0;
    const unitPrice = item.unitPrice ?? item.prixUnitaire ?? 0;
    const vatRate = item.vatRate ?? item.tauxTVA ?? 0;
    const imageUrl = (item as any).imageUrl || (item as any).image || null;
    const totalHT = item.totalHT ?? item.montantHT ?? quantity * unitPrice;
    const totalTTC = item.totalTTC ?? item.montantTTC ?? totalHT * (1 + vatRate / 100);
    return {
      ...item,
      quantity,
      unitPrice,
      vatRate,
      imageUrl,
      totalHT,
      totalTTC,
    } as InvoiceItem & { imageUrl?: string | null; totalHT: number; totalTTC: number };
  });

  const subtotal = invoice.montantHT ?? normalizedItems.reduce((sum, item) => sum + item.totalHT, 0);
  const totalVAT = invoice.montantTVA ?? normalizedItems.reduce((sum, item) => sum + (item.totalTTC - item.totalHT), 0);
  const total = invoice.montantTTC ?? subtotal + totalVAT;
  // Priorité: logo du service > logo de l'entreprise (tenant)
  const logoSrc = invoice.serviceLogoUrl ? resolvePrintLogo(invoice.serviceLogoUrl) : enterpriseLogo;
  const clientLabel =
    invoice.client?.nom ||
    (invoice as any).clientName ||
    invoice.clientId ||
    '-';

  return (
    <PrintLayout
      title="Facture"
      subtitle={`N° ${invoice.numeroFacture}`}
      meta={`Date: ${formatPrintDate(invoice.dateFacture || (invoice as any).dateEmission)}${invoice.dateEcheance ? `\nÉchéance: ${formatPrintDate(invoice.dateEcheance)}` : ''}\nStatut: ${textOrDash(invoice.status)}`}
      companyName={enterpriseName}
      logoSrc={logoSrc}
      onClose={onClose}
    >
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Client</h3>
        <div className="pl-2 text-sm text-gray-700">
          <div className="font-semibold">{textOrDash(clientLabel)}</div>
          {invoice.client?.email && <div>{invoice.client.email}</div>}
          {invoice.client?.telephone && <div>{invoice.client.telephone}</div>}
          {invoice.client?.adresse && <div>{invoice.client.adresse}</div>}
        </div>
      </div>

      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="text-left py-3 px-3 font-semibold">Image</th>
              <th className="text-left py-3 px-3 font-semibold">Description</th>
              <th className="text-right py-3 px-3 font-semibold">Qté</th>
              <th className="text-right py-3 px-3 font-semibold">P.U. HT</th>
              <th className="text-right py-3 px-3 font-semibold">TVA</th>
              <th className="text-right py-3 px-3 font-semibold">Total TTC</th>
            </tr>
          </thead>
          <tbody>
            {normalizedItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3 px-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.description}
                      className="h-10 w-10 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md border bg-gray-100 text-[10px] text-gray-500 flex items-center justify-center">
                      Sans image
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-gray-700">{item.description}</td>
                <td className="text-right py-3 px-3 text-gray-700">{item.quantity}</td>
                <td className="text-right py-3 px-3 text-gray-700">{formatFCFA(item.unitPrice)}</td>
                <td className="text-right py-3 px-3 text-gray-700">{item.vatRate}%</td>
                <td className="text-right py-3 px-3 text-gray-700">{formatFCFA(item.totalTTC)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-700">Sous-total HT:</span>
            <span className="font-semibold text-gray-800">{formatFCFA(subtotal)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-700">TVA:</span>
            <span className="font-semibold text-gray-800">{formatFCFA(totalVAT)}</span>
          </div>
          <div className="flex justify-between py-3 bg-blue-600 text-white px-4 mt-2">
            <span className="font-bold text-lg">TOTAL TTC:</span>
            <span className="font-bold text-lg">{formatFCFA(total)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Notes</h3>
          <p className="text-sm text-gray-600 pl-2 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </PrintLayout>
  );
}
