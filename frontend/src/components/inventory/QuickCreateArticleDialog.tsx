'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ArticleUnit, InventoryArticle } from '@/shared/api/inventory/types';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface QuickCreateArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (article: InventoryArticle) => void;
}

const EMPTY_FORM = {
  nom: '',
  categorie: '',
  unite: 'PIECE' as ArticleUnit,
  prixAchat: '0',
  prixVente: '0',
};

export function QuickCreateArticleDialog({ open, onOpenChange, onCreated }: QuickCreateArticleDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.createArticle({
        nom: form.nom.trim(),
        categorie: form.categorie.trim() || undefined,
        unite: form.unite,
        prixAchat: Number(form.prixAchat) || 0,
        prixVente: Number(form.prixVente) || 0,
        status: 'ACTIF',
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-articles'] });
      const article = (response as any)?.data ?? response;
      toast.success('Produit cree avec succes.');
      if (article) {
        onCreated?.(article as InventoryArticle);
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Impossible de creer le produit.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
          <DialogDescription>Créez un produit puis réutilisez-le immédiatement dans le devis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Nom du produit</label>
            <Input value={form.nom} onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Categorie</label>
            <Input value={form.categorie} onChange={(event) => setForm((current) => ({ ...current, categorie: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Unite</label>
            <select
              value={form.unite}
              onChange={(event) => setForm((current) => ({ ...current, unite: event.target.value as ArticleUnit }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="PIECE">Piece</option>
              <option value="KG">Kg</option>
              <option value="M">Metre</option>
              <option value="L">Litre</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Prix achat</label>
            <Input type="number" min="0" value={form.prixAchat} onChange={(event) => setForm((current) => ({ ...current, prixAchat: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Prix vente</label>
            <Input type="number" min="0" value={form.prixVente} onChange={(event) => setForm((current) => ({ ...current, prixVente: event.target.value }))} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!form.nom.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creation...' : 'Creer le produit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuickCreateArticleDialog;
