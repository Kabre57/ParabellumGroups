'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { List, Plus, Search, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { billingService } from '@/shared/api/billing';
import { useClients } from '@/hooks/useCrm';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Client } from '@/shared/api/crm/types';
import type { InventoryArticle } from '@/shared/api/inventory/types';

interface QuoteLineForm {
  description: string;
  categorie: string;
  quantite: string;
  prixUnitaire: string;
  tauxTVA: string;
  articleId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_LINE: QuoteLineForm = {
  description: '',
  categorie: '',
  quantite: '1',
  prixUnitaire: '0',
  tauxTVA: '0',
  articleId: '',
};

const buildDefaultValidityDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

export function CreateQuoteDialog({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [dateValidite, setDateValidite] = useState(buildDefaultValidityDate());
  const [lines, setLines] = useState<QuoteLineForm[]>([{ ...EMPTY_LINE }]);
  const [productSearch, setProductSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [modalCategory, setModalCategory] = useState('');

  const { data: clients = [] } = useClients({ pageSize: 200 }, { enabled: isOpen });

  const { data: productsResponse, isFetching: loadingProducts } = useQuery({
    queryKey: ['inventory-articles-for-quotes'],
    queryFn: () => inventoryService.getArticles(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof billingService.createQuote>[0]) => billingService.createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const clientsArray: Client[] = Array.isArray(clients) ? clients : [];
  const products: InventoryArticle[] = productsResponse?.data ?? [];
  const serviceLabel = user?.service?.name || user?.department || '';

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.categorie).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b, 'fr')),
    [products]
  );

  const getProductsForCategory = (category?: string) =>
    products.filter((product) => !category || product.categorie === category);

  const filteredModalProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();
    const selectedCategory =
      modalCategory || (activeLine !== null ? lines[activeLine]?.categorie || '' : '');

    return getProductsForCategory(selectedCategory).filter((product) => {
      if (!normalizedSearch) return true;
      return [product.nom, product.reference, product.categorie]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [activeLine, lines, modalCategory, productSearch, products]);

  const totals = useMemo(() => {
    const parsed = lines.map((line) => {
      const quantite = Number(line.quantite) || 0;
      const prixUnitaire = Number(line.prixUnitaire) || 0;
      const tauxTVA = Number(line.tauxTVA) || 0;
      const ht = quantite * prixUnitaire;
      const tva = ht * (tauxTVA / 100);
      return {
        ht,
        tva,
        ttc: ht + tva,
      };
    });

    return {
      ht: parsed.reduce((sum, line) => sum + line.ht, 0),
      tva: parsed.reduce((sum, line) => sum + line.tva, 0),
      ttc: parsed.reduce((sum, line) => sum + line.ttc, 0),
    };
  }, [lines]);

  const resetForm = () => {
    setClientId('');
    setDateValidite(buildDefaultValidityDate());
    setLines([{ ...EMPTY_LINE }]);
    setProductSearch('');
    setActiveLine(null);
    setModalCategory('');
    setProductModalOpen(false);
  };

  const updateLine = (index: number, patch: Partial<QuoteLineForm>) => {
    setLines((current) => current.map((line, currentIndex) => (currentIndex === index ? { ...line, ...patch } : line)));
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    resetForm();
    onClose();
  };

  const handleProductSelect = (index: number, product: InventoryArticle) => {
    updateLine(index, {
      categorie: product.categorie || '',
      description: `${product.reference ? `${product.reference} - ` : ''}${product.nom}`,
      prixUnitaire: String(product.prixVente ?? product.prixAchat ?? 0),
      articleId: product.id,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const lignes = lines
      .filter((line) => line.description.trim())
      .map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantite) || 0,
        unitPrice: Number(line.prixUnitaire) || 0,
        vatRate: Number(line.tauxTVA) || 0,
        articleId: line.articleId || undefined,
      }))
      .filter((line) => line.description && line.quantity > 0);

    if (!clientId || !dateValidite || lignes.length === 0) {
      return;
    }

    await createMutation.mutateAsync({
      clientId,
      dateValidite,
      lignes,
    });

    handleClose();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau devis</DialogTitle>
            <DialogDescription>
              Le devis est saisi a partir des produits du catalogue Achats et sera transforme en facture apres approbation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {serviceLabel && (
              <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Ce devis sera emis au nom du service <strong>{serviceLabel}</strong>.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Client</label>
                <select
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selectionner un client</option>
                  {clientsArray.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Date de validite</label>
                <Input type="date" value={dateValidite} onChange={(event) => setDateValidite(event.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Lignes du devis</p>
                  <p className="text-xs text-muted-foreground">
                    Les lignes reutilisent les articles enregistres dans le module Achats.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Categorie</th>
                      <th className="px-3 py-2">Produit</th>
                      <th className="px-3 py-2 w-24">Qte</th>
                      <th className="px-3 py-2 w-28">PU HT</th>
                      <th className="px-3 py-2 w-24">TVA %</th>
                      <th className="px-3 py-2 w-28">Total TTC</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                      const productsForLine = getProductsForCategory(line.categorie);

                      return (
                        <tr key={`${index}-${line.articleId || 'manual'}`} className="border-t">
                          <td className="px-3 py-2">
                            <select
                              value={line.categorie}
                              onChange={(event) =>
                                updateLine(index, {
                                  categorie: event.target.value,
                                  articleId: '',
                                  description: '',
                                  prixUnitaire: '0',
                                })
                              }
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">Toutes les categories</option>
                              {categories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <select
                                value={line.articleId || ''}
                                onChange={(event) => {
                                  const product = products.find((entry) => entry.id === event.target.value);
                                  if (!product) {
                                    updateLine(index, { articleId: '', description: '' });
                                    return;
                                  }
                                  handleProductSelect(index, product);
                                }}
                                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                              >
                                <option value="">Selectionner un produit</option>
                                {productsForLine.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.reference ? `${product.reference} - ` : ''}
                                    {product.nom}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setActiveLine(index);
                                  setModalCategory(line.categorie || '');
                                  setProductModalOpen(true);
                                }}
                              >
                                <List className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="1"
                              value={line.quantite}
                              onChange={(event) => updateLine(index, { quantite: event.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.prixUnitaire}
                              onChange={(event) => updateLine(index, { prixUnitaire: event.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.tauxTVA}
                              onChange={(event) => updateLine(index, { tauxTVA: event.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {formatCurrency(
                              (Number(line.quantite) || 0) *
                                (Number(line.prixUnitaire) || 0) *
                                (1 + (Number(line.tauxTVA) || 0) / 100)
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={lines.length === 1}
                              onClick={() =>
                                setLines((current) => current.filter((_, currentIndex) => currentIndex !== index))
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-2 rounded-md bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span>Sous-total HT</span>
                <span>{formatCurrency(totals.ht)}</span>
              </div>
              <div className="flex justify-between">
                <span>TVA</span>
                <span>{formatCurrency(totals.tva)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total TTC</span>
                <span>{formatCurrency(totals.ttc)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !clientId || lines.every((line) => !line.description.trim())}
              >
                Enregistrer le devis
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choisir un produit du catalogue</DialogTitle>
            <DialogDescription>
              Le devis reutilise les produits enregistres dans le module Achats.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <select
                value={modalCategory}
                onChange={(event) => setModalCategory(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Toutes les categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Rechercher un produit"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Produit</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Categorie</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Stock</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Prix vente</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Chargement des produits...
                      </td>
                    </tr>
                  ) : filteredModalProducts.length > 0 ? (
                    filteredModalProducts.map((product) => (
                      <tr key={product.id} className="border-t">
                        <td className="px-4 py-3">{product.reference || '-'}</td>
                        <td className="px-4 py-3 font-medium">{product.nom}</td>
                        <td className="px-4 py-3">{product.categorie || '-'}</td>
                        <td className="px-4 py-3">{product.quantiteStock ?? 0}</td>
                        <td className="px-4 py-3">{formatCurrency(product.prixVente ?? product.prixAchat ?? 0)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (activeLine !== null) {
                                handleProductSelect(activeLine, product);
                              }
                              setProductModalOpen(false);
                              setProductSearch('');
                              setModalCategory('');
                              setActiveLine(null);
                            }}
                          >
                            Selectionner
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Aucun produit trouve.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProductModalOpen(false);
                  setActiveLine(null);
                  setModalCategory('');
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
