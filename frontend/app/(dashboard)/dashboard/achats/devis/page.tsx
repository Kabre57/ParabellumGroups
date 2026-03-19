'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { procurementService } from '@/services/procurement';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import type { PurchaseRequest, PurchaseRequestStatus, Supplier } from '@/services/procurement';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DraftLine = {
  articleId: string;
  designation: string;
  categorie: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
};

const statusLabels: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  REJETEE: 'Rejetée',
  COMMANDEE: 'Convertie en BC',
};

const statusColors: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'bg-yellow-100 text-yellow-800',
  SOUMISE: 'bg-blue-100 text-blue-800',
  REJETEE: 'bg-red-100 text-red-800',
  COMMANDEE: 'bg-green-100 text-green-800',
};

const emptyLine = (): DraftLine => ({
  articleId: '',
  designation: '',
  categorie: '',
  quantite: 1,
  prixUnitaire: 0,
  tva: 18,
});

export default function PurchaseQuotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PurchaseRequestStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [dateBesoin, setDateBesoin] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const serviceName =
    user?.service?.name ||
    user?.department ||
    'Service non renseigné';

  const { canCreate, canUpdate } = getCrudVisibility(user, {
    read: ['purchases.read'],
    create: ['purchases.create'],
    update: ['purchases.update', 'purchases.approve'],
  });

  const { data: requestsResponse, isLoading } = useQuery({
    queryKey: ['purchase-quotes', statusFilter, search],
    queryFn: () =>
      procurementService.getRequests({
        limit: 200,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });

  const { data: suppliersResponse } = useQuery({
    queryKey: ['procurement-suppliers-for-quotes'],
    queryFn: () => procurementService.getSuppliers({ limit: 200 }),
  });

  const { data: articlesResponse } = useQuery({
    queryKey: ['inventory-articles-for-quotes'],
    queryFn: () => inventoryService.getArticles(),
    staleTime: 5 * 60 * 1000,
  });

  const requests = requestsResponse?.data ?? [];
  const suppliers = suppliersResponse?.data ?? [];
  const articles = articlesResponse?.data ?? [];

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'SOUMISE').length,
    converted: requests.filter((item) => item.status === 'COMMANDEE').length,
    totalAmount: requests.reduce((sum, item) => sum + (item.montantTTC || item.estimatedAmount || 0), 0),
  }), [requests]);

  const createMutation = useMutation({
    mutationFn: () =>
      procurementService.createRequest({
        titre: title,
        objet: title,
        description,
        fournisseurId: supplierId || undefined,
        dateBesoin: dateBesoin || undefined,
        notes: notes || undefined,
        serviceName,
        lignes: lines
          .filter((line) => line.designation && line.quantite > 0)
          .map((line) => ({
            articleId: line.articleId || undefined,
            designation: line.designation,
            categorie: line.categorie || undefined,
            quantite: line.quantite,
            prixUnitaire: line.prixUnitaire,
            tva: line.tva,
          })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      setOpen(false);
      setTitle('');
      setDescription('');
      setNotes('');
      setSupplierId('');
      setDateBesoin('');
      setLines([emptyLine()]);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => procurementService.submitRequest(id, 'Soumis pour approbation'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => procurementService.approveRequest(id, `Approuvé pour ${serviceName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      procurementService.rejectRequest(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] }),
  });

  const updateLineArticle = (index: number, articleId: string) => {
    const article = articles.find((item) => item.id === articleId);
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              articleId,
              designation: article?.nom || line.designation,
              categorie: article?.categorie || '',
              quantite: line.quantite,
              prixUnitaire: Number(article?.prixAchat ?? article?.prixVente ?? 0),
              tva: line.tva,
            }
          : line
      )
    );
  };

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  };

  const totalTTC = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const ht = line.quantite * line.prixUnitaire;
        return sum + ht * (1 + line.tva / 100);
      }, 0),
    [lines]
  );

  const handleReject = (request: PurchaseRequest) => {
    const reason = window.prompt(`Raison du rejet pour ${request.number}`, 'Hors budget');
    if (reason) {
      rejectMutation.mutate({ id: request.id, reason });
    }
  };

  const supplierName = (id?: string | null) =>
    suppliers.find((item) => item.id === id)?.name || '-';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Devis d&apos;achat</h1>
          <p className="text-sm text-muted-foreground">
            Les demandes sont créées au nom du service métier puis approuvées avant génération du bon de commande.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis d&apos;achat
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total devis</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">En attente</div><div className="text-2xl font-bold text-blue-600">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Convertis en BC</div><div className="text-2xl font-bold text-green-600">{stats.converted}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Montant total</div><div className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR')} F</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des devis d&apos;achat</CardTitle>
          <CardDescription>Suivi par service, fournisseur et statut d&apos;approbation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par numéro, objet ou fournisseur..."
              className="max-w-xl"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PurchaseRequestStatus | 'ALL')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="SOUMISE">Soumise</option>
              <option value="REJETEE">Rejetée</option>
              <option value="COMMANDEE">Convertie en BC</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Numéro</th>
                    <th className="px-4 py-3 font-medium">Objet</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{request.number}</td>
                      <td className="px-4 py-3">{request.objet || request.title}</td>
                      <td className="px-4 py-3">{request.serviceName || '-'}</td>
                      <td className="px-4 py-3">{supplierName(request.supplierId) || request.supplierName}</td>
                      <td className="px-4 py-3 font-medium">
                        {(request.montantTTC || request.estimatedAmount || 0).toLocaleString('fr-FR')} F
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[request.status]}>{statusLabels[request.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && request.status === 'BROUILLON' && (
                            <Button size="sm" variant="outline" onClick={() => submitMutation.mutate(request.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              Soumettre
                            </Button>
                          )}
                          {canUpdate && request.status === 'SOUMISE' && (
                            <>
                              <Button size="sm" onClick={() => approveMutation.mutate(request.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approuver
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleReject(request)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Rejeter
                              </Button>
                            </>
                          )}
                          {request.bonCommandeId && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/achats/commandes/${request.bonCommandeId}`}>Voir BC</Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">
                  Aucun devis d&apos;achat trouvé.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Nouveau devis d&apos;achat</DialogTitle>
            <DialogDescription>
              Le devis sera créé au nom du service <strong>{serviceName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Objet</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Achat équipements réseau" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fournisseur</label>
              <select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((supplier: Supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Contexte du besoin achat"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de besoin</label>
              <Input type="date" value={dateBesoin} onChange={(event) => setDateBesoin(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Urgent / validation budgetaire" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Lignes du devis</h3>
              <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={`line-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[2fr_1fr_110px_140px_110px_50px]">
                  <select
                    value={line.articleId}
                    onChange={(event) => updateLineArticle(index, event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sélectionner un article du catalogue</option>
                    {articles.map((article: InventoryArticle) => (
                      <option key={article.id} value={article.id}>
                        {article.nom} {article.categorie ? `- ${article.categorie}` : ''}
                      </option>
                    ))}
                  </select>
                  <Input value={line.categorie} onChange={(event) => updateLine(index, { categorie: event.target.value })} placeholder="Catégorie" />
                  <Input type="number" min={1} value={line.quantite} onChange={(event) => updateLine(index, { quantite: Number(event.target.value) || 1 })} />
                  <Input type="number" min={0} value={line.prixUnitaire} onChange={(event) => updateLine(index, { prixUnitaire: Number(event.target.value) || 0 })} />
                  <Input type="number" min={0} max={100} value={line.tva} onChange={(event) => updateLine(index, { tva: Number(event.target.value) || 0 })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                  <div className="md:col-span-6 text-sm text-muted-foreground">
                    {line.designation || 'Aucun article sélectionné'} - TTC:
                    {' '}
                    {((line.quantite * line.prixUnitaire) * (1 + line.tva / 100)).toLocaleString('fr-FR')} F
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="items-center justify-between sm:justify-between">
            <div className="text-sm font-medium">
              Total TTC: {totalTTC.toLocaleString('fr-FR')} F
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title || !supplierId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Enregistrement...' : 'Créer le devis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
