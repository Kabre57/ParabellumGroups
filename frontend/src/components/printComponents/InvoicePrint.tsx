'use client';

import React from 'react';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

export default function InvoicePrint({ invoice, onClose }: any) {
  const clientLabel = invoice.client?.nom || invoice.clientName || invoice.clientId || '-';

  return (
    <ProcurementDocumentPrint
      documentLabel="Facture"
      documentNumber={invoice.numeroFacture || invoice.id}
      companyName={undefined} 
      issueDate={invoice.dateFacture || invoice.dateEmission}
      deliveryLeadTime={invoice.dateEcheance ? `Date d'échéance: ${new Date(invoice.dateEcheance).toLocaleDateString('fr-FR')}` : null}
      paymentTerms={invoice.status || 'En attente'}
      recipient={{
        name: clientLabel,
        email: invoice.client?.email,
        phone: invoice.client?.telephone || invoice.client?.phone,
        address: invoice.client?.adresse || invoice.client?.address,
      }}
      lines={(invoice.lignes || []).map((item: any) => ({
        designation: item.description || item.designation,
        quantity: item.quantity ?? item.quantite ?? 0,
        unitPrice: item.unitPrice ?? item.prixUnitaire ?? 0,
        vatRate: item.vatRate ?? item.tauxTVA ?? item.tva ?? 0,
        imageUrl: item.imageUrl || item.image,
      }))}
      notes={invoice.notes}
      signatureLabel="La Direction"
      footerNote="En cas de retard de paiement, des pénalités pourront être appliquées conformément aux conditions générales de vente."
      onClose={onClose}
    />
  );
}
