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

const formatArticleUnit = (unit?: string | null) => {
  switch (unit) {
    case 'PIECE':
      return 'Piece';
    case 'KG':
      return 'Kg';
    case 'M':
      return 'Metre';
    case 'L':
      return 'Litre';
    default:
      return unit || '-';
  }
};

export default function PurchaseProformaPrint({
  request,
  proforma,
  serviceLogoUrl: _serviceLogoUrl,
  onClose,
}: PurchaseProformaPrintProps) {
  return (
    <ProcurementDocumentPrint
      documentLabel="Proforma fournisseur retenue"
      documentNumber={proforma.numeroProforma}
      enterpriseId={request.enterpriseId}
      companyName={request.enterpriseName || undefined}
      issueDate={proforma.approvedAt || proforma.submittedAt || proforma.createdAt || request.date}
      issuedBy={request.requesterEmail || undefined}
      deliveryLeadTime={
        proforma.delaiLivraisonJours ? `${proforma.delaiLivraisonJours} jour(s)` : request.dateBesoin || undefined
      }
      paymentTerms="Selon proforma retenue et validation PDG"
      recipient={{
        name: proforma.fournisseurNom || request.supplierName || request.manualSupplierName || '-',
      }}
      lines={(proforma.lignes || []).map((line) => ({
        imageUrl: line.imageUrl || null,
        designation: line.designation,
        quantity: line.quantite,
        unit: formatArticleUnit(line.unite || null),
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
          ? `Proforma retenue pour commande sur le devis interne ${request.number}.`
          : `Proforma associee au devis interne ${request.number}.`
      }
      signatureLabel="Visa achat / PDG"
      onClose={onClose}
    />
  );
}
