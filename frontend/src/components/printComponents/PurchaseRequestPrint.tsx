'use client';

import React from 'react';
import type { PurchaseRequest, Supplier } from '@/services/procurement';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

interface PurchaseRequestPrintProps {
  request: PurchaseRequest;
  supplier?: Supplier | null;
  serviceLogoUrl?: string | null;
  onClose: () => void;
}

export default function PurchaseRequestPrint({
  request,
  supplier,
  serviceLogoUrl,
  onClose,
}: PurchaseRequestPrintProps) {
  return (
    <ProcurementDocumentPrint
      documentLabel="Devis d'achat"
      documentNumber={request.number}
      serviceName={request.serviceName || 'Service non attribué'}
      serviceLogoUrl={serviceLogoUrl}
      issueDate={request.date}
      issuedBy={request.requesterEmail || request.serviceName || undefined}
      deliveryLeadTime={request.dateBesoin || undefined}
      paymentTerms="Selon conditions d'achat"
      recipient={{
        name: supplier?.name || request.supplierName || '-',
        email: supplier?.email || undefined,
        phone: supplier?.phone || supplier?.telephone || undefined,
        address: supplier?.address || supplier?.adresse || undefined,
      }}
      lines={(request.lines || []).map((line) => ({
        designation: line.designation,
        quantity: line.quantite,
        unit: line.categorie || '-',
        unitPrice: line.prixUnitaire,
        vatRate: line.tva,
        totalHT: line.montantHT,
        totalTTC: line.montantTTC,
      }))}
      notes={request.notes || request.description || undefined}
      footerNote={
        request.dateBesoin
          ? `Besoin exprimé pour le ${new Date(request.dateBesoin).toLocaleDateString('fr-FR')}.`
          : "Document d'expression du besoin achat."
      }
      onClose={onClose}
    />
  );
}
