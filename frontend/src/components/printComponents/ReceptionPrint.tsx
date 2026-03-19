'use client';

import React from 'react';
import type { PurchaseOrder, Supplier } from '@/services/procurement';
import type { Reception } from '@/shared/api/inventory/types';
import ProcurementDocumentPrint from './ProcurementDocumentPrint';

interface ReceptionPrintProps {
  reception: Reception;
  order?: PurchaseOrder | null;
  supplier?: Supplier | null;
  serviceLogoUrl?: string | null;
  onClose: () => void;
}

export default function ReceptionPrint({
  reception,
  order,
  supplier,
  serviceLogoUrl,
  onClose,
}: ReceptionPrintProps) {
  return (
    <ProcurementDocumentPrint
      documentLabel="Bon de réception"
      documentNumber={reception.numero}
      serviceName={order?.serviceName || 'Service non attribué'}
      serviceLogoUrl={serviceLogoUrl}
      issueDate={reception.dateReception}
      issuedBy={order?.serviceName || undefined}
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
          designation: line.designation || line.article?.nom || '-',
          quantity: line.quantiteRecue,
          unit: line.article?.unite || '-',
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
