'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  PackagePlus,
  Printer,
  Save,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import type {
  PurchaseRequest,
  PurchaseRequestApprovalLog,
  PurchaseRequestStatus,
} from '@/services/procurement';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import { adminServicesService, type Service } from '@/shared/api/admin';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PurchaseRequestPrint from '@/components/printComponents/PurchaseRequestPrint';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type DraftLine = {
  id?: string;
  articleId: string;
  designation: string;
  categorie: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
};

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
};

const emptyLine = (): DraftLine => ({
  articleId: '',
  designation: '',
  categorie: '',
  quantite: 1,
  prixUnitaire: 0,
  tva: 18,
});

const statusLabels: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  REJETEE: 'Rejetee',
  COMMANDEE: 'Convertie en BC',
};

const getStatusVariant = (status: PurchaseRequestStatus) => {
  switch (status) {
    case 'SOUMISE':
      return 'warning' as const;
    case 'REJETEE':
      return 'destructive' as const;
    case 'COMMANDEE':
      return 'success' as const;
    default:
      return 'outline' as const;
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('fr-FR');
};

const normalizeTimeline = (
  request: PurchaseRequest | undefined,
  approvalHistory: PurchaseRequestApprovalLog[]
): TimelineItem[] => {
  if (!request) return [];

  const items: TimelineItem[] = [
    {
      id: `created-${request.id}`,
      title: 'Devis d achat cree',
      description: `Creation du devis ${request.number} pour le service ${request.serviceName || 'Non attribue'}.`,
      createdAt: request.date,
      tone: 'neutral',
    },
  ];

  approvalHistory.forEach((log) => {
    const tone =
      log.action === 'APPROVED'
        ? 'success'
        : log.action === 'REJECTED'
        ? 'danger'
        : log.action === 'SUBMITTED'
        ? 'warning'
        : 'neutral';

    items.push({
      id: log.id,
      title: log.action === 'SUBMITTED'
        ? 'Soumission pour approbation'
        : log.action === 'APPROVED'
        ? 'Approbation'
        : log.action === 'REJECTED'
        ? 'Rejet'
        : log.action,
      description: [
        log.actorServiceName || log.actorEmail || 'Acteur inconnu',
        log.commentaire || null,
        `Transition ${log.fromStatus} -> ${log.toStatus}`,
      ]
        .filter(Boolean)
        .join(' · '),
      createdAt: log.createdAt,
      tone,
    });
  });

  if (request.bonCommandeId) {
    items.push({
      id: `bc-${request.bonCommandeId}`,
      title: 'Bon de commande genere',
      description: `Le devis a ete converti en bon de commande ${request.numeroBon || request.bonCommandeId}.`,
      createdAt: request.approvedAt || request.date,
      tone: 'success',
    });
  }

  return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
};

export default function PurchaseQuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [dateBesoin, setDateBesoin] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [isDirty, setIsDirty] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const userServiceId = String(user?.serviceId ?? user?.service?.id ?? '');

  const { canUpdate, canApprove, canReject, canChooseService } = getCrudVisibility(user, {
    read: ['purchases.read'],
    update: ['purchases.update'],
    approve: ['purchases.approve'],
    extras: {
      canReject: ['purchases.reject', 'purchases.approve'],
      canChooseService: ['services.read_all'],
    },
  });

  const { data: requestResponse, isLoading } = useQuery({
    queryKey: ['purchase-quote-detail', id],
    queryFn: () => procurementService.getRequest(id),
    enabled: Boolean(id),
  });

  const { data: approvalHistoryResponse } = useQuery({
    queryKey: ['purchase-quote-approval-history', id],
    queryFn: () => procurementService.getRequestApprovalHistory(id),
    enabled: Boolean(id),
  });

  const { data: suppliersResponse } = useQuery({
    queryKey: ['procurement-suppliers-for-quote-detail'],
    queryFn: () => procurementService.getSuppliers({ limit: 200 }),
  });

  const { data: articlesResponse } = useQuery({
    queryKey: ['inventory-articles-for-quote-detail'],
    queryFn: () => inventoryService.getArticles(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: servicesResponse } = useQuery({
    queryKey: ['procurement-service-options-detail'],
    queryFn: () => adminServicesService.getServices(),
    enabled: canChooseService || !userServiceId,
    staleTime: 5 * 60 * 1000,
  });

  const request = requestResponse?.data;
  const suppliers = suppliersResponse?.data ?? [];
  const articles = articlesResponse?.data ?? [];
  const services = servicesResponse?.data ?? [];
  const approvalHistory = approvalHistoryResponse?.data ?? request?.approvalHistory ?? [];
  const selectedService = services.find((service) => String(service.id) === selectedServiceId);
  const serviceForPrint =
    selectedService ||
    services.find((service) => String(service.id) === String(request?.serviceId ?? ''));

  useEffect(() => {
    if (!request || isDirty) return;

    setTitle(request.objet || request.title || '');
    setDescription(request.description || '');
    setNotes(request.notes || '');
    setSupplierId(request.supplierId || '');
    setSelectedServiceId(String(request.serviceId ?? userServiceId ?? ''));
    setDateBesoin(request.dateBesoin ? request.dateBesoin.slice(0, 10) : '');
    setLines(
      request.lines && request.lines.length > 0
        ? request.lines.map((line) => ({
            id: line.id,
            articleId: line.articleId || '',
            designation: line.designation,
            categorie: line.categorie || '',
            quantite: line.quantite,
            prixUnitaire: line.prixUnitaire,
            tva: line.tva,
          }))
        : [emptyLine()]
    );
  }, [isDirty, request]);

  const canEditRequest =
    Boolean(request) &&
    canUpdate &&
    (request?.status === 'BROUILLON' || request?.status === 'REJETEE');

  const totals = useMemo(() => {
    const montantHT = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0);
    const montantTTC = lines.reduce(
      (sum, line) => sum + line.quantite * line.prixUnitaire * (1 + line.tva / 100),
      0
    );
    return {
      montantHT,
      montantTVA: montantTTC - montantHT,
      montantTTC,
    };
  }, [lines]);

  const timeline = useMemo(() => normalizeTimeline(request, approvalHistory), [approvalHistory, request]);

  const saveMutation = useMutation({
    mutationFn: () =>
      procurementService.updateRequest(id, {
        title,
        objet: title,
        description,
        supplierId: supplierId || null,
        serviceId: selectedServiceId ? Number(selectedServiceId) : undefined,
        serviceName: selectedService?.name || request?.serviceName || null,
        dateBesoin: dateBesoin || null,
        notes,
        lines: lines
          .filter((line) => line.designation && line.quantite > 0)
          .map((line) => ({
            id: line.id,
            articleId: line.articleId || null,
            designation: line.designation,
            categorie: line.categorie || null,
            quantite: line.quantite,
            prixUnitaire: line.prixUnitaire,
            tva: line.tva,
            montantHT: line.quantite * line.prixUnitaire,
            montantTTC: line.quantite * line.prixUnitaire * (1 + line.tva / 100),
          })),
      }),
    onSuccess: () => {
      toast.success('Le devis d achat a ete mis a jour.');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise a jour du devis.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => procurementService.submitRequest(id, 'Soumis depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('Le devis d achat a ete soumis pour approbation.');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la soumission du devis.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => procurementService.approveRequest(id, 'Approuve depuis la fiche detaillee'),
    onSuccess: () => {
      toast.success('Le devis d achat a ete approuve et converti en bon de commande.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseCommitments'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-commitments'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l approbation.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (commentaire: string) => procurementService.rejectRequest(id, commentaire),
    onSuccess: () => {
      toast.success('Le devis d achat a ete rejete.');
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-approval-history', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet.');
    },
  });

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setIsDirty(true);
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  };

  const updateLineArticle = (index: number, articleId: string) => {
    const article = articles.find((item) => item.id === articleId);
    setIsDirty(true);
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              articleId,
              designation: article?.nom || line.designation,
              categorie: article?.categorie || '',
              prixUnitaire: Number(article?.prixAchat ?? article?.prixVente ?? 0),
            }
          : line
      )
    );
  };

  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);

  if (isLoading || !request) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats/devis">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux devis d&apos;achat
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{request.number}</h1>
            <Badge variant={getStatusVariant(request.status)}>{statusLabels[request.status]}</Badge>
            {request.bonCommandeId && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/achats/commandes?selectedOrderId=${request.bonCommandeId}`}>Voir le bon de commande</Link>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Detail, edition et suivi chronologique du devis d&apos;achat pour le service {request.serviceName || 'Non attribue'}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          {canEditRequest && (
            <>
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !isDirty}
              >
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || lines.every((line) => !line.designation)}
              >
                <Send className="mr-2 h-4 w-4" />
                Soumettre
              </Button>
            </>
          )}

          {(canApprove || canReject) && request.status === 'SOUMISE' && (
            <>
              {canApprove && (
                <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approuver
                </Button>
              )}
              {canReject && (
                <Button variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={rejectMutation.isPending}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Service</div><div className="text-lg font-semibold">{request.serviceName || 'Non attribue'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Fournisseur</div><div className="text-lg font-semibold">{selectedSupplier?.name || request.supplierName || '-'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Montant TTC</div><div className="text-lg font-semibold">{formatCurrency(request.montantTTC || request.estimatedAmount || 0)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Derniere etape</div><div className="text-lg font-semibold">{timeline[timeline.length - 1]?.title || 'Creation'}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Edition du devis</CardTitle>
            <CardDescription>
              Modification autorisee tant que le devis est en brouillon ou rejete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {(canChooseService || !request.serviceId) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service demandeur</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedServiceId}
                    onChange={(event) => {
                      setIsDirty(true);
                      setSelectedServiceId(event.target.value);
                    }}
                    disabled={!canEditRequest}
                  >
                    <option value="">Selectionner un service</option>
                    {services.map((service: Service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Objet</label>
                <Input
                  value={title}
                  onChange={(event) => {
                    setIsDirty(true);
                    setTitle(event.target.value);
                  }}
                  disabled={!canEditRequest}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date de besoin</label>
                <Input
                  type="date"
                  value={dateBesoin}
                  onChange={(event) => {
                    setIsDirty(true);
                    setDateBesoin(event.target.value);
                  }}
                  disabled={!canEditRequest}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fournisseur</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={supplierId}
                  onChange={(event) => {
                    setIsDirty(true);
                    setSupplierId(event.target.value);
                  }}
                  disabled={!canEditRequest}
                >
                  <option value="">Selectionner un fournisseur</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Commentaire interne</label>
                <Input
                  value={notes}
                  onChange={(event) => {
                    setIsDirty(true);
                    setNotes(event.target.value);
                  }}
                  disabled={!canEditRequest}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(event) => {
                  setIsDirty(true);
                  setDescription(event.target.value);
                }}
                disabled={!canEditRequest}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Lignes d achat</h2>
                  <p className="text-sm text-muted-foreground">
                    Les prix sont bases sur le prix d achat du catalogue.
                  </p>
                </div>
                {canEditRequest && (
                  <Button variant="outline" onClick={() => {
                    setIsDirty(true);
                    setLines((current) => [...current, emptyLine()]);
                  }}>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Ajouter une ligne
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {lines.map((line, index) => {
                  const lineTotal = line.quantite * line.prixUnitaire * (1 + line.tva / 100);

                  return (
                    <div key={`${line.id || 'new'}-${index}`} className="rounded-xl border bg-slate-50/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">Ligne {index + 1}</div>
                          <div className="text-sm text-muted-foreground">
                            Total TTC: {formatCurrency(lineTotal)}
                          </div>
                        </div>
                        {canEditRequest && lines.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsDirty(true);
                              setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2 xl:col-span-2">
                          <label className="text-sm font-medium">Article</label>
                          <select
                            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={line.articleId}
                            onChange={(event) => updateLineArticle(index, event.target.value)}
                            disabled={!canEditRequest}
                          >
                            <option value="">Selectionner un article</option>
                            {articles.map((article: InventoryArticle) => (
                              <option key={article.id} value={article.id}>
                                {article.nom}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Categorie</label>
                          <Input
                            value={line.categorie}
                            onChange={(event) => updateLine(index, { categorie: event.target.value })}
                            disabled={!canEditRequest}
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2 xl:col-span-2">
                          <label className="text-sm font-medium">Designation</label>
                          <Input
                            value={line.designation}
                            onChange={(event) => updateLine(index, { designation: event.target.value })}
                            disabled={!canEditRequest}
                            className="h-11"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4 xl:col-span-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Quantite</label>
                            <Input
                              type="number"
                              min="1"
                              value={line.quantite}
                              onChange={(event) => updateLine(index, { quantite: Number(event.target.value) || 1 })}
                              disabled={!canEditRequest}
                              className="h-11"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Prix unitaire achat</label>
                            <Input
                              type="number"
                              min="0"
                              value={line.prixUnitaire}
                              onChange={(event) => updateLine(index, { prixUnitaire: Number(event.target.value) || 0 })}
                              disabled={!canEditRequest}
                              className="h-11"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">TVA (%)</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={line.tva}
                              onChange={(event) => updateLine(index, { tva: Number(event.target.value) || 0 })}
                              disabled={!canEditRequest}
                              className="h-11"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Sous-total HT</div><div className="text-lg font-semibold">{formatCurrency(totals.montantHT)}</div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">TVA</div><div className="text-lg font-semibold">{formatCurrency(totals.montantTVA)}</div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total TTC</div><div className="text-lg font-semibold">{formatCurrency(totals.montantTTC)}</div></CardContent></Card>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline metier</CardTitle>
              <CardDescription>
                Chronologie complete depuis la creation jusqu&apos;a la conversion en bon de commande.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          item.tone === 'success'
                            ? 'bg-green-500'
                            : item.tone === 'warning'
                            ? 'bg-amber-500'
                            : item.tone === 'danger'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <div className="mt-1 h-full w-px bg-border" />
                    </div>
                    <div className="pb-4">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique d approbation</CardTitle>
              <CardDescription>
                Journal detaille des actions d approbation et de rejet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Transition</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.actorServiceName || log.actorEmail || '-'}</TableCell>
                      <TableCell>{log.fromStatus} → {log.toStatus}</TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {approvalHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucun evenement d approbation enregistre pour ce devis.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <RejectPurchaseRequestDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        requestNumber={request.number}
        isPending={rejectMutation.isPending}
        onConfirm={(reason) => {
          rejectMutation.mutate(reason, {
            onSuccess: () => {
              setRejectDialogOpen(false);
            },
          });
        }}
      />

      {isPrintOpen && (
        <PurchaseRequestPrint
          request={{
            ...request,
            supplierName: selectedSupplier?.name || request.supplierName || null,
            lines: lines.map((line) => ({
              id: line.id,
              articleId: line.articleId || null,
              designation: line.designation,
              categorie: line.categorie || null,
              quantite: line.quantite,
              prixUnitaire: line.prixUnitaire,
              tva: line.tva,
              montantHT: line.quantite * line.prixUnitaire,
              montantTTC: line.quantite * line.prixUnitaire * (1 + line.tva / 100),
            })),
          }}
          supplier={selectedSupplier}
          serviceLogoUrl={serviceForPrint?.imageUrl}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}
