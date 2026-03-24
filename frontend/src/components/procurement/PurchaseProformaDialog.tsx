'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
      <DialogContent className="max-w-5xl">
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Lignes de la proforma</h3>
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une ligne
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={`proforma-line-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[2fr_1fr_110px_130px_110px_50px]">
                <select
                  value={line.articleId}
                  onChange={(event) => updateLineArticle(index, event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sélectionner un article du catalogue</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {article.nom} {article.categorie ? `- ${article.categorie}` : ''}
                    </option>
                  ))}
                </select>
                <Input value={line.categorie} onChange={(event) => updateLine(index, { categorie: event.target.value })} placeholder="Catégorie" />
                <Input type="number" min={1} value={line.quantite} onChange={(event) => updateLine(index, { quantite: Number(event.target.value) || 1 })} />
                <Input
                  type="number"
                  min={0}
                  value={line.prixUnitaire}
                  onChange={(event) => updateLine(index, { prixUnitaire: Number(event.target.value) || 0 })}
                  placeholder="Prix unitaire"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={line.tva}
                  onChange={(event) => updateLine(index, { tva: Number(event.target.value) || 0 })}
                  placeholder="TVA %"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                  disabled={lines.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
                <div className="md:col-span-6 text-sm text-muted-foreground">
                  {line.designation || 'Aucun article sélectionné'} - Total TTC estimé : {(line.quantite * line.prixUnitaire * (1 + line.tva / 100)).toLocaleString('fr-FR')} F
                </div>
              </div>
            ))}
          </div>
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
