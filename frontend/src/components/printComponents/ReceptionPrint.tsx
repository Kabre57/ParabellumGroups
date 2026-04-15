'use client';

import React from 'react';
import type { PurchaseOrder, Supplier } from '@/services/procurement';
import type { InventoryArticle, Reception } from '@/shared/api/inventory/types';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

const formatArticleUnit = (unit?: string | null) => {
  switch (unit) {
    case 'PIECE':
      return 'Pce';
    case 'KG':
      return 'Kg';
    case 'M':
      return 'M';
    case 'L':
      return 'L';
    default:
      return unit || '-';
  }
};

interface ReceptionPrintProps {
  reception: Reception;
  order?: PurchaseOrder | null;
  supplier?: Supplier | null;
  articles?: InventoryArticle[];
  serviceLogoUrl?: string | null;
  onClose: () => void;
}

export default function ReceptionPrint({
  reception,
  order,
  supplier,
  articles = [],
  serviceLogoUrl: _serviceLogoUrl,
  onClose,
}: ReceptionPrintProps) {
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  return (
    <ProcurementDocumentPrint
      documentLabel="Bon de réception"
      documentNumber={reception.numero}
      serviceName={order?.serviceName || undefined}
      issueDate={reception.dateReception}
      deliveryLeadTime="Réception effectuée"
      paymentTerms={reception.status}
      recipient={{
        name: supplier?.name || order?.supplier || order?.fournisseurNom || reception.fournisseurId || '-',
        email: supplier?.email || order?.supplierEmail || undefined,
        phone: supplier?.phone || supplier?.telephone || undefined,
        address: supplier?.address || supplier?.adresse || undefined,
      }}
      lines={(reception.lignes || []).map((line) => {
        const totalHT = (line.prixUnitaire || 0) * (line.quantiteRecue || 0);
        const totalTTC = totalHT * (1 + Number(line.tva || 0) / 100);

        return {
          imageUrl:
            line.imageUrl ||
            line.article?.imageUrl ||
            (line.articleId ? articleMap.get(line.articleId)?.imageUrl || null : null),
          designation: line.designation || line.article?.nom || '-',
          quantity: line.quantiteRecue,
          unit: formatArticleUnit(line.article?.unite),
          unitPrice: line.prixUnitaire,
          vatRate: line.tva,
          totalHT,
          totalTTC,
        };
      })}
      notes={reception.notes || `Bon de commande lié: ${order?.number || order?.numeroBon || reception.bonCommandeId}`}
      footerNote="Document de contrôle des quantités réceptionnées."
      signatureLabel="Visa de réception"
      onClose={onClose}
    />
  );
}
