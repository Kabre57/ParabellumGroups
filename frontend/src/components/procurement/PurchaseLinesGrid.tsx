'use client';

import React, { useMemo } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type PurchaseLineDraft = {
  id?: string;
  articleId: string;
  designation: string;
  categorie: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
};

interface PurchaseLinesGridProps {
  title: string;
  description?: string;
  lines: PurchaseLineDraft[];
  articles: InventoryArticle[];
  disabled?: boolean;
  maxBodyHeightClass?: string;
  tableMinWidthClass?: string;
  onAddLine: () => void;
  onDuplicateLine?: (index: number) => void;
  onRemoveLine: (index: number) => void;
  onUpdateLine: (index: number, patch: Partial<PurchaseLineDraft>) => void;
  onSelectArticle: (index: number, articleId: string) => void;
  formatCurrency?: (amount: number) => string;
}

const defaultFormatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR').format(Number.isFinite(amount) ? amount : 0)} F CFA`;

export function PurchaseLinesGrid({
  title,
  description,
  lines,
  articles,
  disabled = false,
  maxBodyHeightClass = 'min-h-[280px] max-h-[360px]',
  tableMinWidthClass = 'min-w-[1180px]',
  onAddLine,
  onDuplicateLine,
  onRemoveLine,
  onUpdateLine,
  onSelectArticle,
  formatCurrency = defaultFormatCurrency,
}: PurchaseLinesGridProps) {
  const totals = useMemo(() => {
    const montantHT = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0);
    const montantTVA = lines.reduce(
      (sum, line) => sum + line.quantite * line.prixUnitaire * (line.tva / 100),
      0
    );
    return {
      montantHT,
      montantTVA,
      montantTTC: montantHT + montantTVA,
    };
  }, [lines]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
            {lines.length} ligne{lines.length > 1 ? 's' : ''}
          </div>
          <Button type="button" variant="outline" onClick={onAddLine} disabled={disabled}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une ligne
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
        <div className={`min-h-0 overflow-auto ${maxBodyHeightClass}`}>
          <table className={`w-full ${tableMinWidthClass} text-sm`}>
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr className="border-b">
                <th className="w-14 px-3 py-3 font-semibold">Ligne</th>
                <th className="min-w-[240px] px-3 py-3 font-semibold">Article</th>
                <th className="min-w-[220px] px-3 py-3 font-semibold">Désignation</th>
                <th className="min-w-[170px] px-3 py-3 font-semibold">Catégorie</th>
                <th className="w-28 px-3 py-3 font-semibold">Qté</th>
                <th className="w-36 px-3 py-3 font-semibold">P.U. HT</th>
                <th className="w-24 px-3 py-3 font-semibold">TVA %</th>
                <th className="w-36 px-3 py-3 font-semibold text-right">Total TTC</th>
                <th className="w-24 px-3 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const lineTotal = line.quantite * line.prixUnitaire * (1 + line.tva / 100);

                return (
                  <tr key={`${line.id || 'line'}-${index}`} className="border-b align-top last:border-0">
                    <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-3">
                      <select
                        value={line.articleId}
                        onChange={(event) => onSelectArticle(index, event.target.value)}
                        disabled={disabled}
                        className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
                      >
                        <option value="">Sélectionner un article</option>
                        {articles.map((article) => (
                          <option key={article.id} value={article.id}>
                            {article.nom} {article.categorie ? `- ${article.categorie}` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        value={line.designation}
                        onChange={(event) => onUpdateLine(index, { designation: event.target.value })}
                        disabled={disabled}
                        placeholder="Désignation"
                        className="h-12 text-base"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        value={line.categorie}
                        onChange={(event) => onUpdateLine(index, { categorie: event.target.value })}
                        disabled={disabled}
                        placeholder="Catégorie"
                        className="h-12 text-base"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min="1"
                        value={line.quantite}
                        onChange={(event) => onUpdateLine(index, { quantite: Number(event.target.value) || 1 })}
                        disabled={disabled}
                        className="h-12 min-w-[96px] text-lg font-medium"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min="0"
                        value={line.prixUnitaire}
                        onChange={(event) => onUpdateLine(index, { prixUnitaire: Number(event.target.value) || 0 })}
                        disabled={disabled}
                        className="h-12 min-w-[120px] text-lg font-medium"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={line.tva}
                        onChange={(event) => onUpdateLine(index, { tva: Number(event.target.value) || 0 })}
                        disabled={disabled}
                        className="h-12 min-w-[88px] text-lg font-medium"
                      />
                    </td>
                    <td className="px-3 py-3 text-right align-middle text-base font-semibold whitespace-nowrap">
                      {formatCurrency(lineTotal)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-0.5">
                        {onDuplicateLine ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDuplicateLine(index)}
                            disabled={disabled}
                            title="Dupliquer la ligne"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveLine(index)}
                          disabled={disabled || lines.length === 1}
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 grid gap-3 border-t bg-slate-50 px-4 py-3 text-sm md:grid-cols-4">
          <div className="rounded-md border bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Volume</div>
            <div className="font-semibold">{lines.length} ligne{lines.length > 1 ? 's' : ''}</div>
          </div>
          <div className="rounded-md border bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total HT</div>
            <div className="font-semibold">{formatCurrency(totals.montantHT)}</div>
          </div>
          <div className="rounded-md border bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">TVA</div>
            <div className="font-semibold">{formatCurrency(totals.montantTVA)}</div>
          </div>
          <div className="rounded-md border bg-blue-50 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-blue-700">Total TTC</div>
            <div className="font-semibold text-blue-900">{formatCurrency(totals.montantTTC)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseLinesGrid;
