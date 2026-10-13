'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StockPageModel } from './StockPage.model';

export function StockDialogs(props: StockPageModel) {
  const { dialogOpen, setDialogOpen, selectedArticle, stockItems, createDialogOpen, setCreateDialogOpen, canUpdate, createMovementMutation, form, onSubmit, createArticleForm, createArticleMutation, onCreateArticle } = props;
  return (<>
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajuster le stock</DialogTitle>
            <DialogDescription>
              Creer un mouvement de stock pour l'article selectionne.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Article</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('articleId', { required: true })}
              >
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('type')}
              >
                <option value="ENTREE">Entree</option>
                <option value="SORTIE">Sortie</option>
                <option value="AJUSTEMENT">Ajustement</option>
                <option value="TRANSFERT">Transfert</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantite</label>
              <Input type="number" step="0.01" {...form.register('quantite', { required: true })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date operation</label>
              <Input type="datetime-local" {...form.register('dateOperation')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Numero document</label>
              <Input {...form.register('numeroDocument')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Emplacement</label>
              <Input {...form.register('emplacement')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input {...form.register('notes')} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMovementMutation.isPending}>
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvel article</DialogTitle>
            <DialogDescription>Creer un article de stock.</DialogDescription>
          </DialogHeader>

          <form onSubmit={onCreateArticle} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference</label>
              <Input {...createArticleForm.register('reference')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input {...createArticleForm.register('nom', { required: true })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input {...createArticleForm.register('description')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categorie</label>
              <Input {...createArticleForm.register('categorie')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unite</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...createArticleForm.register('unite')}
              >
                <option value="PIECE">Piece</option>
                <option value="KG">Kg</option>
                <option value="M">Metre</option>
                <option value="L">Litre</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prix achat</label>
              <Input type="number" step="0.01" {...createArticleForm.register('prixAchat')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prix vente</label>
              <Input type="number" step="0.01" {...createArticleForm.register('prixVente')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantite stock</label>
              <Input type="number" step="0.01" {...createArticleForm.register('quantiteStock')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seuil alerte</label>
              <Input type="number" step="0.01" {...createArticleForm.register('seuilAlerte')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seuil rupture</label>
              <Input type="number" step="0.01" {...createArticleForm.register('seuilRupture')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Emplacement</label>
              <Input {...createArticleForm.register('emplacement')} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createArticleMutation.isPending}
              >
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
</>);
}
