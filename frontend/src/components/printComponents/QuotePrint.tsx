'use client';

import React from 'react';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

export default function QuotePrint({ quote, onClose }: any) {
  return (
    <ProcurementDocumentPrint
      documentLabel="Devis"
      documentNumber={quote.quoteNumber || quote.id}
      companyName={undefined} 
      issueDate={quote.date}
      issuedBy={quote.createdBy ? `${quote.createdBy.firstName} ${quote.createdBy.lastName}` : null}
      deliveryLeadTime={quote.validUntil ? `Valable jusqu'au ${new Date(quote.validUntil).toLocaleDateString('fr-FR')}` : '30 jours'}
      recipient={{
        name: quote.customer?.name,
        email: quote.customer?.email,
        phone: quote.customer?.phone,
        address: quote.customer?.address,
      }}
      lines={(quote.items || []).map((item: any) => ({
        designation: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        imageUrl: item.imageUrl,
      }))}
      notes={quote.notes}
      signatureLabel="Bon pour accord (Signature du client)"
      footerNote="Le présent devis est établi sous réserve d'acceptation dans le délai de validité indiqué. Les conditions de paiement seront définies lors de la finalisation de la commande."
      onClose={onClose}
    />
  );
}
