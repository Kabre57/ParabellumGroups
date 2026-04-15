'use client';

import React from 'react';
import type { PurchaseRequest, Supplier } from '@/services/procurement';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

interface PurchaseRequestPrintProps {
  request: PurchaseRequest;
  supplier?: Supplier | null;
  articles?: InventoryArticle[];
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

export default function PurchaseRequestPrint({
  request,
  supplier,
  articles = [],
  serviceLogoUrl: _serviceLogoUrl,
  onClose,
}: PurchaseRequestPrintProps) {
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  return (
    <ProcurementDocumentPrint
      documentLabel="Devis d'achat"
      documentNumber={request.number}
      serviceName={request.serviceName || undefined}
      issueDate={request.date}
      issuedBy={request.requesterEmail || undefined}
      deliveryLeadTime={request.dateBesoin || undefined}
      paymentTerms="Selon conditions d'achat"
      recipient={{
        name: supplier?.name || request.supplierName || '-',
        email: supplier?.email || undefined,
        phone: supplier?.phone || supplier?.telephone || undefined,
        address: supplier?.address || supplier?.adresse || undefined,
      }}
      lines={(request.lines || []).map((line) => ({
        imageUrl: line.imageUrl || (line.articleId ? articleMap.get(line.articleId)?.imageUrl || null : null),
        designation: line.designation,
        quantity: line.quantite,
        unit: formatArticleUnit(line.unite || (line.articleId ? articleMap.get(line.articleId)?.unite || null : null)),
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
