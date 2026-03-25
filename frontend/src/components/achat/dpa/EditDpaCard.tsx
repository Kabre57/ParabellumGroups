'use client';

import React from 'react';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import type { Supplier } from '@/services/procurement';
import type { Service } from '@/shared/api/admin';
import { Card, CardContent } from '@/components/ui/card';
import { DpaFormFields } from './DpaFormFields';
import { PurchaseLinesGrid } from '@/components/procurement/PurchaseLinesGrid';
import type { DpaDraftLine } from './types';

interface EditDpaCardProps {
  canEdit: boolean;
  showServiceSelector: boolean;
  selectedServiceId: string;
  services: Service[];
  onServiceChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  dateBesoin: string;
  onDateBesoinChange: (value: string) => void;
  supplierId: string;
  suppliers: Supplier[];
  onSupplierChange: (value: string) => void;
  manualSupplierName: string;
  onManualSupplierNameChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  lines: DpaDraftLine[];
  articles: InventoryArticle[];
  onAddLine: () => void;
  onDuplicateLine: (index: number) => void;
  onRemoveLine: (index: number) => void;
  onUpdateLine: (index: number, patch: Partial<DpaDraftLine>) => void;
  onSelectArticle: (index: number, articleId: string) => void;
  formatCurrency: (amount: number) => string;
  totals: {
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
  };
}

export function EditDpaCard({
  canEdit,
  showServiceSelector,
  selectedServiceId,
  services,
  onServiceChange,
  title,
  onTitleChange,
  dateBesoin,
  onDateBesoinChange,
  supplierId,
  suppliers,
  onSupplierChange,
  manualSupplierName,
  onManualSupplierNameChange,
  notes,
  onNotesChange,
  description,
  onDescriptionChange,
  lines,
  articles,
  onAddLine,
  onDuplicateLine,
  onRemoveLine,
  onUpdateLine,
  onSelectArticle,
  formatCurrency,
  totals,
}: EditDpaCardProps) {
  return (
    <>
      <DpaFormFields
        showServiceSelector={showServiceSelector}
        selectedServiceId={selectedServiceId}
        services={services}
        onServiceChange={onServiceChange}
        title={title}
        onTitleChange={onTitleChange}
        dateBesoin={dateBesoin}
        onDateBesoinChange={onDateBesoinChange}
        supplierId={supplierId}
        suppliers={suppliers}
        onSupplierChange={onSupplierChange}
        manualSupplierName={manualSupplierName}
        onManualSupplierNameChange={onManualSupplierNameChange}
        notes={notes}
        onNotesChange={onNotesChange}
        description={description}
        onDescriptionChange={onDescriptionChange}
        disabled={!canEdit}
      />

      <PurchaseLinesGrid
        title="Lignes d achat"
        description="Présentation compacte type ERP pour garder les en-têtes visibles et travailler confortablement même avec beaucoup de lignes."
        lines={lines}
        articles={articles}
        disabled={!canEdit}
        maxBodyHeightClass="min-h-[320px] max-h-[460px]"
        tableMinWidthClass="min-w-[1180px]"
        onAddLine={onAddLine}
        onDuplicateLine={onDuplicateLine}
        onRemoveLine={onRemoveLine}
        onUpdateLine={onUpdateLine}
        onSelectArticle={onSelectArticle}
        formatCurrency={formatCurrency}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Sous-total HT</div><div className="text-lg font-semibold">{formatCurrency(totals.montantHT)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">TVA</div><div className="text-lg font-semibold">{formatCurrency(totals.montantTVA)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total TTC</div><div className="text-lg font-semibold">{formatCurrency(totals.montantTTC)}</div></CardContent></Card>
      </div>
    </>
  );
}

export default EditDpaCard;
