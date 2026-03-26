'use client';

import React from 'react';
import type { PurchaseOrder, Supplier } from '@/services/procurement';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

interface PurchaseOrderPrintProps {
  order: PurchaseOrder;
  supplier?: Supplier | null;
  articles?: InventoryArticle[];
  serviceLogoUrl?: string | null;
  onClose: () => void;
}

export default function PurchaseOrderPrint({
  order,
  supplier,
  articles = [],
  serviceLogoUrl,
  onClose,
}: PurchaseOrderPrintProps) {
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  return (
    <ProcurementDocumentPrint
      documentLabel="Commande d'achat"
      documentNumber={order.number || order.numeroBon || order.id}
      serviceName={order.serviceName || 'Service non attribué'}
      serviceLogoUrl={serviceLogoUrl}
      issueDate={order.date}
      issuedBy={order.serviceName || undefined}
      deliveryLeadTime={order.deliveryDate || undefined}
      paymentTerms="Selon bon de commande"
      recipient={{
        name: supplier?.name || order.supplier || order.fournisseurNom || '-',
        email: supplier?.email || order.supplierEmail || undefined,
        phone: supplier?.phone || supplier?.telephone || undefined,
        address: supplier?.address || supplier?.adresse || undefined,
      }}
      lines={(order.itemsDetail || []).map((line) => ({
        imageUrl: line.imageUrl || (line.articleId ? articleMap.get(line.articleId)?.imageUrl || null : null),
        designation: line.designation,
        quantity: line.quantity ?? line.quantite ?? 0,
        unit: line.categorie || '-',
        unitPrice: line.unitPrice ?? line.prixUnitaire ?? 0,
        vatRate: line.tva,
        totalHT: line.amountHT,
        totalTTC: line.amount ?? line.montantTTC,
      }))}
      notes={
        order.requestNumber
          ? `Document généré à partir de la DPA ${order.requestNumber}.`
          : "Bon de commande fournisseur."
      }
      footerNote="Une seule réception est autorisée par bon de commande."
      onClose={onClose}
    />
  );
}
