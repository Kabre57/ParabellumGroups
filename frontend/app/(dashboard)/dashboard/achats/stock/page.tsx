'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, List, MoveRight, Plus } from 'lucide-react';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle, StockMovement, StockMovementType } from '@/shared/api/inventory/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function StockPage() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');

  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<InventoryArticle | null>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  const { data: stockItemsResponse, isLoading: itemsLoading } = useQuery<
    Awaited<ReturnType<typeof inventoryService.getArticles>>
  >({
    queryKey: ['inventory-articles', categoryFilter, showLowStock],
    queryFn: () =>
      inventoryService.getArticles({
        categorie: categoryFilter || undefined,
      }),
  });

  const { data: movementsResponse, isLoading: movementsLoading } = useQuery<
    Awaited<ReturnType<typeof inventoryService.getMovements>>
  >({
    queryKey: ['inventory-movements'],
    queryFn: () => inventoryService.getMovements(),
    enabled: activeTab === 'movements',
  });

  const stockItems = stockItemsResponse?.data ?? [];
  const movements = movementsResponse?.data ?? [];

  const filteredItems = useMemo(() => {
    const normalizedCategory = categoryFilter.trim().toLowerCase();
    return stockItems.filter((item) => {
      if (normalizedCategory && !item.category.toLowerCase().includes(normalizedCategory)) {
        return false;
      }
      if (showLowStock) {
        return item.quantity <= item.threshold;
      }
      return true;
    });
  }, [stockItems, categoryFilter, showLowStock]);

  const lowStockCount = stockItems.filter(
    (item: InventoryArticle) =>
      (item.quantiteStock ?? 0) <= (item.seuilAlerte ?? 0)
  ).length;

  const createMovementMutation = useMutation({
    mutationFn: (values: MovementFormValues) =>
      inventoryService.createMovement({
        articleId: values.articleId,
        type: values.type,
        quantite: Number(values.quantite) || 0,
        dateOperation: values.dateOperation || undefined,
        numeroDocument: values.numeroDocument || undefined,
        emplacement: values.emplacement || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-articles'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });

  const form = useForm<MovementFormValues>({
    defaultValues: {
      articleId: '',
      type: 'AJUSTEMENT',
      quantite: '',
      dateOperation: '',
      numeroDocument: '',
      emplacement: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      articleId: selectedArticle?.id || stockItems[0]?.id || '',
      type: 'AJUSTEMENT',
      quantite: '',
      dateOperation: '',
      numeroDocument: '',
      emplacement: selectedArticle?.emplacement || '',
      notes: '',
    });
  }, [dialogOpen, selectedArticle, stockItems, form]);

  const openAdjust = (article?: InventoryArticle) => {
    setSelectedArticle(article || null);
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit((values) => {
    createMovementMutation.mutate(values);
    setDialogOpen(false);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Stock</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openAdjust()}>
            <Plus className="mr-2 h-4 w-4" />
            Ajuster stock
          </Button>
          <Button variant="outline" onClick={() => setComingSoonOpen(true)}>
            Ajouter un article
          </Button>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 py-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            Ajustements disponibles via inventory-service. Verifiez les droits
            `inventory.update` et `stock_movements.create`.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Articles en stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      {lowStockCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
            <div>
              <div className="font-semibold text-red-900">Alerte stock faible</div>
              <div>
                {lowStockCount} article{lowStockCount > 1 ? 's sont' : ' est'} en dessous du seuil
                de reapprovisionnement.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Stock</CardTitle>
              <CardDescription>Articles et mouvements de stock.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'items' ? 'default' : 'outline'}
                onClick={() => setActiveTab('items')}
              >
                <List className="mr-2 h-4 w-4" />
                Articles
              </Button>
              <Button
                variant={activeTab === 'movements' ? 'default' : 'outline'}
                onClick={() => setActiveTab('movements')}
              >
                <MoveRight className="mr-2 h-4 w-4" />
                Mouvements
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeTab === 'items' && (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[220px]">
                  <label className="text-sm font-medium">Categorie</label>
                  <Input
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="Filtrer par categorie..."
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showLowStock}
                    onChange={(e) => setShowLowStock(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Afficher uniquement le stock faible
                </label>
              </div>

              {itemsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Spinner />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Article</th>
                        <th className="px-4 py-3 font-medium">Categorie</th>
                        <th className="px-4 py-3 font-medium">Quantite</th>
                        <th className="px-4 py-3 font-medium">Seuil</th>
                        <th className="px-4 py-3 font-medium">Emplacement</th>
                        <th className="px-4 py-3 font-medium">Dernier reappr.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item: InventoryArticle) => {
                        const isLowStock =
                          (item.quantiteStock ?? 0) <= (item.seuilAlerte ?? 0);
                        return (
                          <tr
                            key={item.id}
                            className={`border-b last:border-0 ${
                              isLowStock ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-medium">{item.nom}</td>
                            <td className="px-4 py-3">{item.categorie || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={isLowStock ? 'text-red-600' : ''}>
                                {item.quantiteStock ?? 0} {item.unite || ''}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {item.seuilAlerte ?? '-'} {item.unite || ''}
                            </td>
                            <td className="px-4 py-3">{item.emplacement || '-'}</td>
                            <td className="px-4 py-3">
                              {item.updatedAt
                                ? new Date(item.updatedAt).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAdjust(item)}
                              >
                                Ajuster
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      Aucun article trouve.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'movements' && (
            <>
              {movementsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Spinner />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Article</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Quantite</th>
                        <th className="px-4 py-3 font-medium">Utilisateur</th>
                        <th className="px-4 py-3 font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement: StockMovement) => (
                        <tr key={movement.id} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            {movement.dateOperation
                              ? new Date(movement.dateOperation).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {movement.article?.nom || movement.articleId}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                movement.type === 'ENTREE'
                                  ? 'bg-green-100 text-green-800'
                                  : movement.type === 'SORTIE'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {movement.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {movement.type === 'ENTREE' ? '+' : movement.type === 'SORTIE' ? '-' : ''}
                            {movement.quantite}
                          </td>
                          <td className="px-4 py-3">{movement.utilisateurId || '-'}</td>
                          <td className="px-4 py-3">{movement.numeroDocument || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {movements.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      Aucun mouvement enregistre.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bientot disponible</DialogTitle>
            <DialogDescription>
              L'ajout direct d'articles sera disponible bientot. Utilisez la page
              Produits pour creer un article.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MovementFormValues {
  articleId: string;
  type: StockMovementType;
  quantite: string;
  dateOperation?: string;
  numeroDocument?: string;
  emplacement?: string;
  notes?: string;
}
