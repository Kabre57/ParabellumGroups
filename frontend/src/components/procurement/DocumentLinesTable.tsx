'use client';

import React, { useMemo } from 'react';

type DocumentLine = {
  id?: string;
  imageUrl?: string | null;
  designation: string;
  categorie?: string | null;
  quantite: number;
  prixUnitaire: number;
  tva?: number | null;
  montantHT?: number;
  montantTTC?: number;
};

interface DocumentLinesTableProps {
  title: string;
  description?: string;
  lines: DocumentLine[];
  heightClass?: string;
  currencyLabel?: string;
}

const formatCurrency = (amount: number, currencyLabel: string) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)} ${currencyLabel}`;

export function DocumentLinesTable({
  title,
  description,
  lines,
  heightClass = 'h-[360px]',
  currencyLabel = 'F CFA',
}: DocumentLinesTableProps) {
  const totals = useMemo(() => {
    const montantHT = lines.reduce(
      (sum, line) =>
        sum +
        (line.montantHT ??
          Number(line.quantite || 0) * Number(line.prixUnitaire || 0)),
      0
    );
    const montantTTC = lines.reduce(
      (sum, line) =>
        sum +
        (line.montantTTC ??
          Number(line.quantite || 0) *
            Number(line.prixUnitaire || 0) *
            (1 + Number(line.tva || 0) / 100)),
      0
    );
    return {
      montantHT,
      montantTVA: montantTTC - montantHT,
      montantTTC,
    };
  }, [lines]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
        <div className={`min-h-0 overflow-auto ${heightClass}`}>
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr className="border-b">
                <th className="w-14 px-3 py-3 font-semibold">Ligne</th>
                <th className="w-20 px-3 py-3 font-semibold">Image</th>
                <th className="min-w-[300px] px-3 py-3 font-semibold">Désignation</th>
                <th className="min-w-[180px] px-3 py-3 font-semibold">Catégorie</th>
                <th className="w-28 px-3 py-3 font-semibold">Qté</th>
                <th className="w-36 px-3 py-3 font-semibold">P.U. HT</th>
                <th className="w-28 px-3 py-3 font-semibold">TVA %</th>
                <th className="w-40 px-3 py-3 font-semibold text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const montantTTC =
                  line.montantTTC ??
                  Number(line.quantite || 0) *
                    Number(line.prixUnitaire || 0) *
                    (1 + Number(line.tva || 0) / 100);

                return (
                  <tr key={`${line.id || line.designation}-${index}`} className="border-b align-top last:border-0">
                    <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-3">
                      {line.imageUrl ? (
                        <img
                          src={line.imageUrl}
                          alt={line.designation || `Ligne ${index + 1}`}
                          className="h-12 w-12 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                          Sans image
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{line.designation || '-'}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{line.categorie || '-'}</td>
                    <td className="px-3 py-3 text-base font-medium">{line.quantite}</td>
                    <td className="px-3 py-3 text-base font-medium whitespace-nowrap">{formatCurrency(line.prixUnitaire, currencyLabel)}</td>
                    <td className="px-3 py-3 text-base font-medium">{Number(line.tva || 0)}%</td>
                    <td className="px-3 py-3 text-right text-base font-semibold whitespace-nowrap">{formatCurrency(montantTTC, currencyLabel)}</td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Aucune ligne disponible.
                  </td>
                </tr>
              )}
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
            <div className="font-semibold">{formatCurrency(totals.montantHT, currencyLabel)}</div>
          </div>
          <div className="rounded-md border bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">TVA</div>
            <div className="font-semibold">{formatCurrency(totals.montantTVA, currencyLabel)}</div>
          </div>
          <div className="rounded-md border bg-blue-50 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-blue-700">Total TTC</div>
            <div className="font-semibold text-blue-900">{formatCurrency(totals.montantTTC, currencyLabel)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentLinesTable;
