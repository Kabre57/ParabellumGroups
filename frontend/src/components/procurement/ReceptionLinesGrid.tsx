'use client';

import React from 'react';

type ReceptionLine = {
  designation: string;
  articleId: string | null;
  quantiteRecue: number;
  prixUnitaire: number;
  tva?: number | null;
};

type ArticleOption = {
  id: string;
  nom?: string;
  reference?: string;
};

interface ReceptionLinesGridProps {
  lines: ReceptionLine[];
  articles: ArticleOption[];
  selections: Record<number, string>;
  onSelectArticle: (index: number, articleId: string) => void;
  heightClass?: string;
}

export function ReceptionLinesGrid({
  lines,
  articles,
  selections,
  onSelectArticle,
  heightClass = 'h-[320px]',
}: ReceptionLinesGridProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
      <div className={`min-h-0 overflow-auto ${heightClass}`}>
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr className="border-b">
              <th className="w-14 px-3 py-3 font-semibold">Ligne</th>
              <th className="min-w-[300px] px-3 py-3 font-semibold">Désignation</th>
              <th className="min-w-[320px] px-3 py-3 font-semibold">Article stock</th>
              <th className="w-28 px-3 py-3 font-semibold">Qté reçue</th>
              <th className="w-32 px-3 py-3 font-semibold">P.U.</th>
              <th className="w-28 px-3 py-3 font-semibold">TVA %</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.designation}-${index}`} className="border-b align-top last:border-0">
                <td className="px-3 py-3 text-xs font-semibold text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-3 font-medium">{line.designation}</td>
                <td className="px-3 py-3">
                  <select
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selections[index] ?? line.articleId ?? ''}
                    onChange={(event) => onSelectArticle(index, event.target.value)}
                  >
                    <option value="">Associer à un article…</option>
                    {articles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.nom || article.reference || article.id}
                        {article.reference ? ` (${article.reference})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 text-base font-medium">{line.quantiteRecue}</td>
                <td className="px-3 py-3 text-base font-medium whitespace-nowrap">{line.prixUnitaire.toLocaleString('fr-FR')} F</td>
                <td className="px-3 py-3 text-base font-medium">{Number(line.tva || 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
        Associe chaque ligne à un article de stock pour garder une réception exploitable par l’inventaire.
      </div>
    </div>
  );
}

export default ReceptionLinesGrid;
