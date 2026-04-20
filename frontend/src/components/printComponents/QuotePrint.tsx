'use client';

import React from 'react';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

export default function QuotePrint({ quote, onClose }: any) {
  return (
    <ProcurementDocumentPrint
      documentLabel="Devis"
      documentNumber={quote.numeroDevis || quote.quoteNumber || quote.id}
      companyName={undefined} 
      issueDate={quote.dateEmission || quote.date}
      issuedBy={quote.commercialName || (quote.createdBy ? `${quote.createdBy.firstName} ${quote.createdBy.lastName}` : null)}
      deliveryLeadTime={quote.dateValidite || quote.validUntil ? `Valable jusqu'au ${new Date(quote.dateValidite || quote.validUntil).toLocaleDateString('fr-FR')}` : '30 jours'}
      recipient={{
        name: quote.client?.nom || quote.client?.raisonSociale || quote.customer?.name || quote.clientName,
        email: quote.client?.email || quote.customer?.email,
        phone: quote.client?.telephone || quote.customer?.phone,
        address: quote.client?.adresse || quote.customer?.address,
      }}
      lines={(quote.lignes || quote.items || []).map((line: any) => ({
        designation: line.description || line.designation,
        quantity: line.quantity || line.quantite,
        unitPrice: line.unitPrice || line.prixUnitaire,
        vatRate: line.vatRate || line.tauxTVA,
        imageUrl: line.imageUrl,
      }))}
      notes={quote.notes}
      signatureLabel="Bon pour accord (Signature du client)"
      footerNote="Le présent devis est établi sous réserve d'acceptation dans le délai de validité indiqué."
      onClose={onClose}
    />
  );
}
