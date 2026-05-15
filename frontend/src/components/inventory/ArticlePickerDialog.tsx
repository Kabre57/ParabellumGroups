'use client';

import { useMemo, useState } from 'react';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ArticlePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: InventoryArticle[];
  onSelect: (article: InventoryArticle) => void;
  title?: string;
  description?: string;
}

export function ArticlePickerDialog({
  open,
  onOpenChange,
  articles,
  onSelect,
  title = 'Choisir dans la liste complete',
  description = 'Recherchez un produit puis injectez-le directement dans la ligne en cours.',
}: ArticlePickerDialogProps) {
  const [search, setSearch] = useState('');

  const filteredArticles = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return articles;
    return articles.filter((article) =>
      [article.nom, article.reference, article.categorie, article.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [articles, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par nom, reference ou categorie..."
          />

          <div className="min-h-0 overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Produit</th>
                  <th className="px-4 py-3 font-semibold">Categorie</th>
                  <th className="px-4 py-3 font-semibold">Unite</th>
                  <th className="px-4 py-3 font-semibold text-right">Prix achat</th>
                  <th className="px-4 py-3 font-semibold text-right">Prix vente</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{article.nom}</div>
                      <div className="text-xs text-muted-foreground">{article.reference || article.description || '-'}</div>
                    </td>
                    <td className="px-4 py-3">{article.categorie || '-'}</td>
                    <td className="px-4 py-3">{article.unite || '-'}</td>
                    <td className="px-4 py-3 text-right">{Number(article.prixAchat || 0).toLocaleString('fr-FR')} F</td>
                    <td className="px-4 py-3 text-right">{Number(article.prixVente || 0).toLocaleString('fr-FR')} F</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onSelect(article);
                          onOpenChange(false);
                          setSearch('');
                        }}
                      >
                        Choisir
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredArticles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Aucun produit ne correspond a la recherche.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ArticlePickerDialog;
