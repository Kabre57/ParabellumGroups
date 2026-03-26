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
import { Textarea } from '@/components/ui/textarea';
import { PurchaseLinesGrid } from '@/components/procurement/PurchaseLinesGrid';

type DraftLine = {
  articleId: string;
  imageUrl?: string;
  designation: string;
  categorie: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
};

const emptyLine = (): DraftLine => ({
  articleId: '',
  imageUrl: '',
  designation: '',
  categorie: '',
  quantite: 1,
  prixUnitaire: 0,
  tva: 18,
});

interface CreateProformaDialogProps {
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
    delaiLivraisonJours?: number;
    disponibilite?: string;
    observationsAchat?: string;
    lignes: PurchaseProformaLine[];
  }) => void;
}

export function CreateProformaDialog({
  open,
  onOpenChange,
  suppliers,
  articles,
  defaultTitle,
  defaultSupplierId,
  isPending,
  onSubmit,
}: CreateProformaDialogProps) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [supplierId, setSupplierId] = useState(defaultSupplierId || '');
  const [notes, setNotes] = useState('');
  const [deliveryDelayDays, setDeliveryDelayDays] = useState('0');
  const [availability, setAvailability] = useState('');
  const [purchasingObservations, setPurchasingObservations] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const totals = useMemo(() => {
    const montantTTC = lines.reduce(
      (sum, line) => sum + line.quantite * line.prixUnitaire * (1 + line.tva / 100),
      0
    );
    return { montantTTC };
  }, [lines]);

  const reset = () => {
    setTitle(defaultTitle || '');
    setSupplierId(defaultSupplierId || '');
    setNotes('');
    setDeliveryDelayDays('0');
    setAvailability('');
    setPurchasingObservations('');
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
              imageUrl: article?.imageUrl || '',
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
      <DialogContent className="grid h-[95vh] max-h-[95vh] w-[min(96vw,1500px)] max-w-none grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden px-4 sm:max-w-[min(96vw,1500px)] sm:px-5">
        <DialogHeader>
          <DialogTitle>Nouvelle proforma</DialogTitle>
          <DialogDescription>
            Enregistrez une proforma fournisseur liée à la DPA, puis soumettez la proforma retenue au DG.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Délai (jours)</label>
            <Input
              type="number"
              min="0"
              value={deliveryDelayDays}
              onChange={(event) => setDeliveryDelayDays(event.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Disponibilité</label>
            <Input
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              placeholder="En stock / partiel / sur commande"
            />
          </div>
          <div className="space-y-2 md:col-span-2 2xl:col-span-3">
            <label className="text-sm font-medium">Observations achat</label>
            <Textarea
              value={purchasingObservations}
              onChange={(event) => setPurchasingObservations(event.target.value)}
              placeholder="Conditions, risques, délais réels, disponibilité..."
              className="min-h-[76px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes internes</label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Référence / commentaire interne" />
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <PurchaseLinesGrid
            title="Lignes de la proforma"
            description="Présentation dense type ERP pour comparer et saisir beaucoup de lignes sans allonger la fenêtre."
            lines={lines}
            articles={articles}
            maxBodyHeightClass="min-h-[340px] max-h-[48vh]"
            tableMinWidthClass="min-w-[1100px]"
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

        <DialogFooter className="sticky bottom-0 gap-3 border-t bg-background pt-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <div className="min-w-0 text-sm text-muted-foreground">
            Total TTC saisi : {totals.montantTTC.toLocaleString('fr-FR')} F
          </div>
          <Button
            className="shrink-0"
            onClick={() => {
              onSubmit({
                titre: title || undefined,
                fournisseurId: supplierId,
                notes: notes || undefined,
                delaiLivraisonJours: Number(deliveryDelayDays) > 0 ? Number(deliveryDelayDays) : undefined,
                disponibilite: availability || undefined,
                observationsAchat: purchasingObservations || undefined,
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

export default CreateProformaDialog;
