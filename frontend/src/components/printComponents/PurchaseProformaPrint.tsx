'use client';

import React from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

interface PurchaseProformaPrintProps {
  request: PurchaseRequest;
  proforma: PurchaseProforma;
  serviceLogoUrl?: string | null;
  onClose: () => void;
}

export default function PurchaseProformaPrint({
  request,
  proforma,
  serviceLogoUrl,
  onClose,
}: PurchaseProformaPrintProps) {
  return (
    <ProcurementDocumentPrint
      documentLabel="Proforma fournisseur retenue"
      documentNumber={proforma.numeroProforma}
      serviceName={request.serviceName || 'Service non attribue'}
      serviceLogoUrl={serviceLogoUrl}
      issueDate={proforma.approvedAt || proforma.submittedAt || proforma.createdAt || request.date}
      issuedBy={proforma.approvedByServiceName || request.serviceName || request.requesterEmail || undefined}
      deliveryLeadTime={
        proforma.delaiLivraisonJours ? `${proforma.delaiLivraisonJours} jour(s)` : request.dateBesoin || undefined
      }
      paymentTerms="Selon proforma retenue et validation DG"
      recipient={{
        name: proforma.fournisseurNom || request.supplierName || request.manualSupplierName || '-',
      }}
      lines={(proforma.lignes || []).map((line) => ({
        imageUrl: line.imageUrl || null,
        designation: line.designation,
        quantity: line.quantite,
        unit: line.categorie || '-',
        unitPrice: line.prixUnitaire,
        vatRate: line.tva,
        totalHT: line.montantHT,
        totalTTC: line.montantTTC,
      }))}
      notes={
        [
          proforma.notes?.trim(),
          proforma.disponibilite ? `Disponibilite: ${proforma.disponibilite}` : null,
          proforma.observationsAchat ? `Observations achat: ${proforma.observationsAchat}` : null,
          proforma.committeeDecision ? `Decision commission: ${proforma.committeeDecision}` : null,
          proforma.committeeDecisionNote ? `Justification: ${proforma.committeeDecisionNote}` : null,
        ]
          .filter(Boolean)
          .join('\n\n') || undefined
      }
      footerNote={
        proforma.selectedForOrder
          ? `Proforma retenue pour commande sur la DPA ${request.number}.`
          : `Proforma associee a la DPA ${request.number}.`
      }
      signatureLabel="Visa achat / DG"
      onClose={onClose}
    />
  );
}
