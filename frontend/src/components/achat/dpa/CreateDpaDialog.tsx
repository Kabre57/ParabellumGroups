'use client';

import React from 'react';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import type { Supplier } from '@/services/procurement';
import type { Service } from '@/shared/api/admin';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PurchaseLinesGrid } from '@/components/procurement/PurchaseLinesGrid';
import { DpaFormFields } from './DpaFormFields';
import type { DpaDraftLine } from './types';

interface CreateDpaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseLabel: string;
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
  totalTTC: number;
  isPending?: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}

export function CreateDpaDialog({
  open,
  onOpenChange,
  enterpriseLabel,
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
  totalTTC,
  isPending = false,
  canSubmit,
  onSubmit,
}: CreateDpaDialogProps) {
  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[95vh] max-h-[95vh] w-[min(98vw,1680px)] max-w-none grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden px-4 sm:max-w-[min(98vw,1680px)] sm:px-5 lg:px-6">
        <DialogHeader>
          <DialogTitle>Nouveau devis interne</DialogTitle>
          <DialogDescription>
            Gérez le devis interne et ses informations avant soumission et validation.
          </DialogDescription>
        </DialogHeader>

        {enterpriseLabel ? (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Ce devis interne sera émis au nom de l&apos;entreprise <strong>{enterpriseLabel}</strong>.
          </div>
        ) : null}

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
        />

        <div className="min-h-0 flex-1">
          <PurchaseLinesGrid
            title="Lignes du devis interne"
            description="Saisie compacte inspirée des ERP: travaille par grille et fais défiler les lignes sans étirer toute la fenêtre."
            lines={lines}
            articles={articles}
            maxBodyHeightClass="min-h-[360px] max-h-[52vh]"
            tableMinWidthClass="min-w-[1100px]"
            onAddLine={onAddLine}
            onDuplicateLine={onDuplicateLine}
            onRemoveLine={onRemoveLine}
            onUpdateLine={onUpdateLine}
            onSelectArticle={onSelectArticle}
            formatCurrency={(amount) => `${amount.toLocaleString('fr-FR')} F`}
          />
        </div>

        <DialogFooter className="gap-3 border-t bg-background pt-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <div className="min-w-0 text-sm text-muted-foreground">
            Total estimé : {totalTTC.toLocaleString('fr-FR')} F
          </div>
          <Button className="shrink-0" onClick={onSubmit} disabled={!canSubmit || isPending}>
            {isPending ? 'Enregistrement...' : 'Créer le devis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDpaDialog;
