'use client';
import { useStockPageModel } from './StockPage.model';
import { StockDialogs } from './StockDialogs';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, List, MoveRight, Plus, Printer } from 'lucide-react';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type {
  InventoryArticle,
  StockMovement,
  StockMovementType,
  ArticleUnit,
} from '@/shared/api/inventory/types';
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
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import TabularListPrint from '@/components/printComponents/TabularListPrint';
import { formatFCFA, formatPrintDate, textOrDash } from '@/components/printComponents/printUtils';

export default function StockPage() {

  const pageModel = useStockPageModel();
  const { user, categoryFilter, setCategoryFilter, showLowStock, setShowLowStock, activeTab, setActiveTab, queryClient, dialogOpen, setDialogOpen, selectedArticle, setSelectedArticle, createDialogOpen, setCreateDialogOpen, isPrintOpen, setIsPrintOpen, stockItemsResponse, itemsLoading, movementsResponse, movementsLoading, stockItems, movements, filteredItems, lowStockCount, totalStockValue, canCreate, canUpdate, createMovementMutation, form, openAdjust, createArticleForm, createArticleMutation, onSubmit, onCreateArticle } = pageModel;

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
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          {canUpdate && (
            <Button variant="outline" onClick={() => openAdjust()}>
              <Plus className="mr-2 h-4 w-4" />
              Ajuster stock
            </Button>
          )}
          {canCreate && (
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
              Ajouter un article
            </Button>
          )}
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
                      {filteredItems.map((item: InventoryArticle, idx) => {
                        const isLowStock =
                          (item.quantiteStock ?? 0) <= (item.seuilAlerte ?? 0);
                        return (
                          <tr
                            key={item.id ?? idx}
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
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAdjust(item)}
                                >
                                  Ajuster
                                </Button>
                              )}
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
                      {movements.map((movement: StockMovement, idx) => (
                        <tr key={movement.id ?? idx} className="border-b last:border-0">
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

      {canUpdate && (
      <StockDialogs {...pageModel} />
      )}

      {canCreate && (
      <StockDialogs {...pageModel} />
      )}

      {isPrintOpen && (
        <TabularListPrint
          title={activeTab === 'items' ? 'État du stock' : 'Mouvements de stock'}
          subtitle={
            activeTab === 'items'
              ? 'Articles, seuils et emplacements'
              : 'Historique des mouvements'
          }
          serviceName={user?.service?.name || user?.department || 'Service achat'}
          columns={
            activeTab === 'items'
              ? [
                  { key: 'article', label: 'Article' },
                  { key: 'category', label: 'Catégorie' },
                  { key: 'quantity', label: 'Quantité', align: 'right' as const },
                  { key: 'threshold', label: 'Seuil', align: 'right' as const },
                  { key: 'location', label: 'Emplacement' },
                  { key: 'lastRestocked', label: 'Dernier réappro.' },
                ]
              : [
                  { key: 'date', label: 'Date' },
                  { key: 'article', label: 'Article' },
                  { key: 'type', label: 'Type', align: 'center' as const },
                  { key: 'quantity', label: 'Quantité', align: 'right' as const },
                  { key: 'user', label: 'Utilisateur' },
                  { key: 'reference', label: 'Référence' },
                ]
          }
          rows={
            activeTab === 'items'
              ? filteredItems.map((item) => ({
                  article: item.nom,
                  category: textOrDash(item.categorie),
                  quantity: `${item.quantiteStock ?? 0} ${item.unite || ''}`.trim(),
                  threshold: `${item.seuilAlerte ?? '-'} ${item.unite || ''}`.trim(),
                  location: textOrDash(item.emplacement),
                  lastRestocked: formatPrintDate(item.updatedAt),
                }))
              : movements.map((movement) => ({
                  date: formatPrintDate(movement.dateOperation),
                  article: movement.article?.nom || movement.articleId,
                  type: movement.type,
                  quantity: movement.quantite,
                  user: textOrDash(movement.utilisateurId),
                  reference: textOrDash(movement.numeroDocument),
                }))
          }
          summary={
            activeTab === 'items'
              ? [
                  { label: 'Articles', value: filteredItems.length },
                  { label: 'Stock faible', value: lowStockCount },
                  { label: 'Valeur stock', value: formatFCFA(totalStockValue) },
                ]
              : [
                  { label: 'Mouvements', value: movements.length },
                  { label: 'Date édition', value: formatPrintDate(new Date(), true) },
                ]
          }
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}
