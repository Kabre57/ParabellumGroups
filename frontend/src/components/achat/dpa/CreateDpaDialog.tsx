'use client';

import React from 'react';
import type { Enterprise } from '@/lib/api';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import type { Supplier } from '@/services/procurement';
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
  title: string;
  onTitleChange: (value: string) => void;
  enterpriseId: string;
  enterprises: Enterprise[];
  onEnterpriseChange: (value: string) => void;
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
  title,
  onTitleChange,
  enterpriseId,
  enterprises,
  onEnterpriseChange,
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
      <DialogContent className="max-h-[92vh] w-[min(98vw,1680px)] max-w-none overflow-y-auto px-4 sm:max-w-[min(98vw,1680px)] sm:px-5 lg:px-6">
        <DialogHeader>
          <DialogTitle>Nouveau devis interne</DialogTitle>
          <DialogDescription>
            Gérez le devis interne et ses informations avant soumission et validation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <DpaFormFields
            title={title}
            onTitleChange={onTitleChange}
            enterpriseId={enterpriseId}
            enterprises={enterprises}
            onEnterpriseChange={onEnterpriseChange}
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

          <PurchaseLinesGrid
            title="Lignes du devis interne"
            description="Saisie compacte inspirée des ERP: travaille par grille et fais défiler les lignes sans étirer toute la fenêtre."
            lines={lines}
            articles={articles}
            maxBodyHeightClass="min-h-[320px] max-h-[52vh]"
            tableMinWidthClass="min-w-[1100px]"
            onAddLine={onAddLine}
            onDuplicateLine={onDuplicateLine}
            onRemoveLine={onRemoveLine}
            onUpdateLine={onUpdateLine}
            onSelectArticle={onSelectArticle}
            formatCurrency={(amount) => `${amount.toLocaleString('fr-FR')} F`}
          />

          <DialogFooter className="gap-3 border-t bg-background pt-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
            <div className="min-w-0 text-sm text-muted-foreground">
              Total estimé : {totalTTC.toLocaleString('fr-FR')} F
            </div>
            <Button className="shrink-0" onClick={onSubmit} disabled={!canSubmit || isPending}>
              {isPending ? 'Enregistrement...' : 'Créer le devis'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDpaDialog;
