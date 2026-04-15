'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { PurchaseRequest, PurchaseRequestStatus } from '@/services/procurement';
import { adminServicesService } from '@/shared/api/admin';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import { CreateDpaDialog } from '@/components/achat/dpa/CreateDpaDialog';
import {
  createEmptyDpaDraftLine,
  type DpaDraftLine,
} from '@/components/achat/dpa';

const statusLabels: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  APPROUVEE: 'Validée DG',
  REJETEE: 'Rejetée',
  PROFORMAS_EN_COURS: 'Proformas en préparation',
  PROFORMA_SOUMISE: 'Proforma soumise DG',
  PROFORMA_APPROUVEE: 'Proforma validée',
  COMMANDEE: 'Convertie en BC',
};

const statusColors: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'bg-yellow-100 text-yellow-800',
  SOUMISE: 'bg-blue-100 text-blue-800',
  APPROUVEE: 'bg-emerald-100 text-emerald-800',
  REJETEE: 'bg-red-100 text-red-800',
  PROFORMAS_EN_COURS: 'bg-violet-100 text-violet-800',
  PROFORMA_SOUMISE: 'bg-indigo-100 text-indigo-800',
  PROFORMA_APPROUVEE: 'bg-cyan-100 text-cyan-800',
  COMMANDEE: 'bg-green-100 text-green-800',
};

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
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [dateBesoin, setDateBesoin] = useState('');
  const [lines, setLines] = useState<DpaDraftLine[]>([createEmptyDpaDraftLine()]);
  const [rejectTarget, setRejectTarget] = useState<PurchaseRequest | null>(null);

  const userServiceId = String(user?.serviceId ?? user?.service?.id ?? '');
  const enterpriseLabel = user?.enterprise?.name || 'Entreprise non attribuée';
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const hasDirectPermission = (...permissions: string[]) =>
    permissions.some((permission) => permissionSet.has(permission.toLowerCase()));
  const canManageAllQuotes =
    isAdminRole(user) ||
    hasDirectPermission(
      'quotes.read_all',
      'purchases.read_all',
      'purchase_requests.read_all',
      'purchase_orders.create',
      'purchase_orders.update',
      'purchase_requests.approve'
    );
  const canReadOwnQuotesOnly =
    !canManageAllQuotes &&
    hasDirectPermission(
      'purchases.read',
      'purchases.create',
      'purchases.update',
      'purchase_requests.read',
      'purchase_requests.read_own',
      'purchase_requests.create',
      'purchase_requests.update'
    );
  const canCreate =
    isAdminRole(user) || hasDirectPermission('purchases.create', 'purchase_requests.create');
  const canApprove =
    isAdminRole(user) || hasDirectPermission('purchase_requests.approve');
  const canReject = canApprove;
  const canChooseService = isAdminRole(user) || hasDirectPermission('services.read_all');
  const canCreateOrder =
    isAdminRole(user) || hasDirectPermission('purchase_orders.create', 'purchase_orders.update');
  const canSubmit =
    isAdminRole(user) ||
    (hasDirectPermission('purchases.submit') && canCreateOrder);

  useEffect(() => {
    if (!selectedServiceId && userServiceId) {
      setSelectedServiceId(userServiceId);
    }
  }, [selectedServiceId, userServiceId]);

  const { data: requestsResponse, isLoading } = useQuery({
    queryKey: ['purchase-quotes', statusFilter, search, user?.id, canReadOwnQuotesOnly],
    queryFn: () =>
      procurementService.getRequests({
        limit: 200,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
        requesterId: canReadOwnQuotesOnly ? String(user?.id ?? '') : undefined,
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

  const { data: servicesResponse } = useQuery({
    queryKey: ['procurement-service-options'],
    queryFn: () => adminServicesService.getServices(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const requests = (requestsResponse?.data ?? []).filter((request) =>
    canReadOwnQuotesOnly ? String(request.requesterId || '') === String(user?.id ?? '') : true
  );
  const suppliers = suppliersResponse?.data ?? [];
  const articles = articlesResponse?.data ?? [];
  const services = servicesResponse?.data ?? [];
  const selectedService = services.find((service) => String(service.id) === selectedServiceId);
  const requestServiceName =
    selectedService?.name ||
    user?.service?.name ||
    user?.department ||
    undefined;
  const draftTotals = useMemo(() => {
    const montantHT = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0);
    const montantTTC = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire * (1 + line.tva / 100), 0);
    return { montantHT, montantTTC };
  }, [lines]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'SOUMISE' || item.status === 'PROFORMA_SOUMISE').length,
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
        fournisseurNomLibre: supplierId ? undefined : manualSupplierName || undefined,
        dateBesoin: dateBesoin || undefined,
        notes: notes || undefined,
        serviceId: selectedServiceId ? Number(selectedServiceId) : undefined,
        serviceName: requestServiceName,
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
      setManualSupplierName('');
      setSelectedServiceId(userServiceId);
      setDateBesoin('');
      setLines([createEmptyDpaDraftLine()]);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création du devis interne.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => procurementService.submitRequest(id, 'Soumis pour approbation'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      procurementService.approveRequest(id, `Approuvé pour ${requestServiceName || 'le service demandeur'}`),
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
              imageUrl: article?.imageUrl || '',
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

  const updateLine = (index: number, patch: Partial<DpaDraftLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  };

  const supplierName = (id?: string | null) =>
    suppliers.find((item) => item.id === id)?.name || '';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Devis internes</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos devis internes et leurs informations.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total devis internes</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">En attente</div><div className="text-2xl font-bold text-blue-600">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Convertis en BC</div><div className="text-2xl font-bold text-green-600">{stats.converted}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Montant total</div><div className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR')} F</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des devis internes</CardTitle>
          <CardDescription>Rechercher, consulter et suivre.</CardDescription>
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
              <option value="APPROUVEE">Validée DG</option>
              <option value="REJETEE">Rejetée</option>
              <option value="PROFORMAS_EN_COURS">Proformas en préparation</option>
              <option value="PROFORMA_SOUMISE">Proforma soumise DG</option>
              <option value="PROFORMA_APPROUVEE">Proforma validée</option>
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
                      <td className="px-4 py-3">{supplierName(request.supplierId) || request.supplierName || request.manualSupplierName || '-'}</td>
                      <td className="px-4 py-3 font-medium">
                        {(request.montantTTC || request.estimatedAmount || 0) > 0
                          ? `${(request.montantTTC || request.estimatedAmount || 0).toLocaleString('fr-FR')} F`
                          : 'À définir par achat'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[request.status]}>{statusLabels[request.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/achats/devis/${request.id}`}>Voir</Link>
                          </Button>
                          {canSubmit && (request.status === 'BROUILLON' || request.status === 'REJETEE') && (
                            <Button size="sm" variant="outline" onClick={() => submitMutation.mutate(request.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              Soumettre à validation
                            </Button>
                          )}
                          {request.status === 'SOUMISE' && (canApprove || canReject) && (
                            <>
                              {canApprove && (
                                <Button size="sm" onClick={() => approveMutation.mutate(request.id)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Approuver
                                </Button>
                              )}
                              {canReject && (
                                <Button size="sm" variant="outline" onClick={() => setRejectTarget(request)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Rejeter
                                </Button>
                              )}
                            </>
                          )}
                          {request.bonCommandeId && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/achats/commandes?selectedOrderId=${request.bonCommandeId}`}>Voir BC</Link>
                            </Button>
                          )}
                          {!request.bonCommandeId &&
                            ['APPROUVEE', 'PROFORMAS_EN_COURS', 'PROFORMA_SOUMISE', 'PROFORMA_APPROUVEE'].includes(request.status) &&
                            canCreateOrder && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/achats/devis/${request.id}`}>
                                {request.status === 'PROFORMA_APPROUVEE' ? 'Générer BC' : 'Gérer proformas'}
                              </Link>
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
                  Aucun devis interne trouvé.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateDpaDialog
        open={open}
        onOpenChange={setOpen}
        enterpriseLabel={enterpriseLabel}
        showServiceSelector={canChooseService || !userServiceId}
        selectedServiceId={selectedServiceId}
        services={services}
        onServiceChange={setSelectedServiceId}
        title={title}
        onTitleChange={setTitle}
        dateBesoin={dateBesoin}
        onDateBesoinChange={setDateBesoin}
        supplierId={supplierId}
        suppliers={suppliers}
        onSupplierChange={(value) => {
          setSupplierId(value);
          if (value) {
            setManualSupplierName('');
          }
        }}
        manualSupplierName={manualSupplierName}
        onManualSupplierNameChange={(value) => {
          setManualSupplierName(value);
          if (value.trim()) {
            setSupplierId('');
          }
        }}
        notes={notes}
        onNotesChange={setNotes}
        description={description}
        onDescriptionChange={setDescription}
        lines={lines}
        articles={articles}
        onAddLine={() => setLines((current) => [...current, createEmptyDpaDraftLine()])}
        onDuplicateLine={(index) =>
          setLines((current) => {
            const source = current[index];
            return [...current.slice(0, index + 1), { ...source, id: undefined }, ...current.slice(index + 1)];
          })
        }
        onRemoveLine={(index) => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
        onUpdateLine={updateLine}
        onSelectArticle={updateLineArticle}
        totalTTC={draftTotals.montantTTC}
        isPending={createMutation.isPending}
        canSubmit={Boolean(title && selectedServiceId && (supplierId || manualSupplierName.trim()))}
        onSubmit={() => createMutation.mutate()}
      />

      <RejectPurchaseRequestDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        requestNumber={rejectTarget?.number}
        defaultReason="Hors budget"
        isPending={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          rejectMutation.mutate(
            { id: rejectTarget.id, reason },
            {
              onSuccess: () => {
                setRejectTarget(null);
              },
            }
          );
        }}
      />
    </div>
  );
}
