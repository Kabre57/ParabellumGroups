'use client';

import React, { useMemo, useState } from 'react';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import type { Supplier, PurchaseProformaLine } from '@/services/procurement';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PurchaseLinesGrid } from '@/components/procurement/PurchaseLinesGrid';

type DraftLine = {
  articleId: string;
  designation: string;
  categorie: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
};

const emptyLine = (): DraftLine => ({
  articleId: '',
  designation: '',
  categorie: '',
  quantite: 1,
  prixUnitaire: 0,
  tva: 18,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  articles: InventoryArticle[];
  defaultTitle?: string;
  defaultSupplierId?: string | null;
  isPending?: boolean;
  onSubmit: (payload: {
    titre?: string;
    fournisseurId: string;
    notes?: string;
    lignes: PurchaseProformaLine[];
  }) => void;
}

export function PurchaseProformaDialog({
  open,
  onOpenChange,
  suppliers,
  articles,
  defaultTitle,
  defaultSupplierId,
  isPending,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [supplierId, setSupplierId] = useState(defaultSupplierId || '');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const totals = useMemo(() => {
    const montantHT = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0);
    const montantTTC = lines.reduce(
      (sum, line) => sum + line.quantite * line.prixUnitaire * (1 + line.tva / 100),
      0
    );
    return { montantHT, montantTTC };
  }, [lines]);

  const reset = () => {
    setTitle(defaultTitle || '');
    setSupplierId(defaultSupplierId || '');
    setNotes('');
    setLines([emptyLine()]);
  };

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  };

  const updateLineArticle = (index: number, articleId: string) => {
    const article = articles.find((item) => item.id === articleId);
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              articleId,
              designation: article?.nom || line.designation,
              categorie: article?.categorie || '',
              prixUnitaire: Number(article?.prixAchat ?? article?.prixVente ?? 0),
            }
          : line
      )
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nouvelle proforma</DialogTitle>
          <DialogDescription>
            Enregistrez une proforma fournisseur liée à la DPA, puis soumettez la proforma retenue au DG.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Intitulé</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Proforma fournisseur principale" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fournisseur</label>
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sélectionner un fournisseur</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Notes</label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Commentaire achat / délai / conditions" />
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <PurchaseLinesGrid
            title="Lignes de la proforma"
            description="Présentation dense type ERP pour comparer et saisir beaucoup de lignes sans allonger la fenêtre."
            lines={lines}
            articles={articles}
            maxBodyHeightClass="max-h-[42vh]"
            onAddLine={() => setLines((current) => [...current, emptyLine()])}
            onDuplicateLine={(index) =>
              setLines((current) => {
                const source = current[index];
                return [...current.slice(0, index + 1), { ...source }, ...current.slice(index + 1)];
              })
            }
            onRemoveLine={(index) =>
              setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
            }
            onUpdateLine={updateLine}
            onSelectArticle={updateLineArticle}
            formatCurrency={(amount) => `${amount.toLocaleString('fr-FR')} F`}
          />
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <div className="text-sm font-medium">
            Total proforma : {totals.montantTTC.toLocaleString('fr-FR')} F
          </div>
          <Button
            onClick={() => {
              onSubmit({
                titre: title || undefined,
                fournisseurId: supplierId,
                notes: notes || undefined,
                lignes: lines
                  .filter((line) => line.designation && line.quantite > 0)
                  .map((line) => ({
                    articleId: line.articleId || null,
                    designation: line.designation,
                    categorie: line.categorie || null,
                    quantite: line.quantite,
                    prixUnitaire: line.prixUnitaire,
                    tva: line.tva,
                    montantHT: line.quantite * line.prixUnitaire,
                    montantTTC: line.quantite * line.prixUnitaire * (1 + line.tva / 100),
                  })),
              });
            }}
            disabled={!supplierId || isPending}
          >
            {isPending ? 'Enregistrement...' : 'Créer la proforma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PurchaseProformaDialog;
