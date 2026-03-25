'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  PackageCheck,
  PackagePlus,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseRequest,
  PurchaseRequestStatus,
} from '@/services/procurement';
import { billingService, type PurchaseCommitment } from '@/shared/api/billing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';

type DashboardFocus =
  | 'drafts'
  | 'approval'
  | 'rejected'
  | 'converted'
  | 'orders'
  | 'overdue'
  | 'commitments';

type DashboardBadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary';

type AlertItem = {
  id: string;
  type: 'QUOTE' | 'ORDER';
  number: string;
  label: string;
  serviceName: string;
  supplierName: string;
  amount: number;
  overdueDays: number;
  href: string;
};

type ServiceCommitmentSummary = {
  serviceName: string;
  totalAmount: number;
  quoteCount: number;
  orderCount: number;
  pendingAmount: number;
  overdueOrders: number;
};

const requestStatusLabels: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  APPROUVEE: 'Validée DG',
  REJETEE: 'Rejetee',
  PROFORMAS_EN_COURS: 'Proformas en préparation',
  PROFORMA_SOUMISE: 'Proforma soumise DG',
  PROFORMA_APPROUVEE: 'Proforma validée',
  COMMANDEE: 'Convertie en BC',
};

const orderStatusLabels: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoye',
  CONFIRME: 'Confirme',
  LIVRE: 'Livre',
  ANNULE: 'Annule',
};

const getRequestStatusVariant = (status: PurchaseRequestStatus): DashboardBadgeVariant => {
  switch (status) {
    case 'SOUMISE':
      return 'warning';
    case 'APPROUVEE':
      return 'success';
    case 'PROFORMAS_EN_COURS':
      return 'outline';
    case 'PROFORMA_SOUMISE':
      return 'warning';
    case 'PROFORMA_APPROUVEE':
      return 'success';
    case 'COMMANDEE':
      return 'success';
    case 'REJETEE':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getOrderStatusVariant = (status: PurchaseOrderStatus): DashboardBadgeVariant => {
  switch (status) {
    case 'CONFIRME':
    case 'LIVRE':
      return 'success';
    case 'ENVOYE':
      return 'default';
    case 'ANNULE':
      return 'destructive';
    default:
      return 'outline';
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
  return parsed.toLocaleDateString('fr-FR');
};

const daysBetween = (from?: string | null, to = new Date()) => {
  if (!from) return 0;
  const parsed = new Date(from);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, Math.floor((to.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
};

const normalizeText = (value?: string | null) => String(value || '').toLowerCase();

const matchesSearch = (needle: string, values: Array<string | number | null | undefined>) => {
  if (!needle) return true;
  const normalizedNeedle = normalizeText(needle).trim();
  return values.some((value) => normalizeText(value == null ? '' : String(value)).includes(normalizedNeedle));
};

const overdueOrderStatuses: PurchaseOrderStatus[] = ['BROUILLON', 'ENVOYE', 'CONFIRME'];

export default function ProcurementOverviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<DashboardFocus>('approval');
  const [rejectTarget, setRejectTarget] = useState<PurchaseRequest | null>(null);

  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const hasDirectPermission = (...permissions: string[]) =>
    permissions.some((permission) => permissionSet.has(permission.toLowerCase()));
  const canCreate = isAdminRole(user) || hasDirectPermission('purchases.create', 'purchase_requests.create');
  const canApprove = isAdminRole(user) || hasDirectPermission('purchase_requests.approve');
  const canReject = canApprove;

  const { data: requestsResponse, isLoading: requestsLoading } = useQuery({
    queryKey: ['procurement-dashboard-requests'],
    queryFn: () => procurementService.getRequests({ limit: 200 }),
  });

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['procurement-dashboard-orders'],
    queryFn: () => procurementService.getOrders({ limit: 200 }),
  });

  const { data: commitmentsResponse, isLoading: commitmentsLoading } = useQuery({
    queryKey: ['procurement-dashboard-commitments'],
    queryFn: () => billingService.getPurchaseCommitments(),
  });

  const requests = requestsResponse?.data ?? [];
  const orders = ordersResponse?.data ?? [];
  const commitments = commitmentsResponse?.data ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => procurementService.approveRequest(id, 'Approuve depuis le dashboard achats'),
    onSuccess: () => {
      toast.success('La DPA a été validée. Le service achat peut maintenant enregistrer les proformas.');
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-commitments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseCommitments'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseCommitmentStats'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'approbation de la DPA.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, commentaire }: { id: string; commentaire: string }) =>
      procurementService.rejectRequest(id, commentaire),
    onSuccess: () => {
      toast.success('La DPA a ete rejetee.');
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet de la DPA.');
    },
  });

  const isLoading = requestsLoading || ordersLoading || commitmentsLoading;

  const availableServices = useMemo(() => {
    const values = new Set<string>();

    [...requests, ...orders, ...commitments].forEach((item: any) => {
      const serviceName = String(item?.serviceName || '').trim();
      if (serviceName) {
        values.add(serviceName);
      }
    });

    return ['ALL', ...Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [requests, orders, commitments]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const serviceName = request.serviceName || 'Non attribue';
      const supplierName = request.supplierName || '-';

      return (
        (serviceFilter === 'ALL' || serviceName === serviceFilter) &&
        matchesSearch(search, [
          request.number,
          request.objet,
          request.title,
          serviceName,
          supplierName,
          request.requesterEmail,
        ])
      );
    });
  }, [requests, search, serviceFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const serviceName = order.serviceName || 'Non attribue';
      const supplierName = order.supplier || order.fournisseurNom || '-';

      return (
        (serviceFilter === 'ALL' || serviceName === serviceFilter) &&
        matchesSearch(search, [
          order.number,
          order.requestNumber,
          serviceName,
          supplierName,
          order.status,
        ])
      );
    });
  }, [orders, search, serviceFilter]);

  const filteredCommitments = useMemo(() => {
    return commitments.filter((commitment) => {
      const serviceName = commitment.serviceName || 'Non attribue';
      return (
        (serviceFilter === 'ALL' || serviceName === serviceFilter) &&
        matchesSearch(search, [
          commitment.sourceNumber,
          commitment.serviceName,
          commitment.supplierName,
          commitment.status,
          commitment.sourceType,
        ])
      );
    });
  }, [commitments, search, serviceFilter]);

  const pendingApprovalRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'SOUMISE'),
    [filteredRequests]
  );

  const pendingProformaApprovals = useMemo(
    () => filteredRequests.filter((request) => request.status === 'PROFORMA_SOUMISE'),
    [filteredRequests]
  );

  const draftRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'BROUILLON'),
    [filteredRequests]
  );

  const convertedRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'COMMANDEE'),
    [filteredRequests]
  );

  const rejectedRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'REJETEE'),
    [filteredRequests]
  );

  const activeOrders = useMemo(
    () => filteredOrders.filter((order) => overdueOrderStatuses.includes(order.status)),
    [filteredOrders]
  );

  const overdueRequests = useMemo(
    () =>
      pendingApprovalRequests
        .filter((request) => daysBetween(request.submittedAt || request.date) > 2)
        .sort(
          (left, right) =>
            daysBetween(right.submittedAt || right.date) - daysBetween(left.submittedAt || left.date)
        ),
    [pendingApprovalRequests]
  );

  const overdueOrders = useMemo(
    () =>
      activeOrders
        .filter((order) => {
          if (!order.deliveryDate) return false;
          const deliveryDate = new Date(order.deliveryDate);
          return !Number.isNaN(deliveryDate.getTime()) && deliveryDate.getTime() < Date.now();
        })
        .sort((left, right) => daysBetween(right.deliveryDate) - daysBetween(left.deliveryDate)),
    [activeOrders]
  );

  const alertItems = useMemo<AlertItem[]>(() => {
    const quoteAlerts = overdueRequests.map((request) => ({
      id: request.id,
      type: 'QUOTE' as const,
      number: request.number,
      label: request.objet || request.title,
      serviceName: request.serviceName || 'Non attribue',
      supplierName: request.supplierName || '-',
      amount: request.montantTTC || request.estimatedAmount || 0,
      overdueDays: daysBetween(request.submittedAt || request.date),
      href: `/dashboard/achats/devis/${request.id}`,
    }));

    const orderAlerts = overdueOrders.map((order) => ({
      id: order.id,
      type: 'ORDER' as const,
      number: order.number,
      label: order.requestNumber || 'Bon de commande',
      serviceName: order.serviceName || 'Non attribue',
      supplierName: order.supplier || order.fournisseurNom || '-',
      amount: order.montantTotal || order.amount || 0,
      overdueDays: daysBetween(order.deliveryDate),
      href: `/dashboard/achats/commandes?selectedOrderId=${order.id}`,
    }));

    return [...quoteAlerts, ...orderAlerts]
      .sort((left, right) => right.overdueDays - left.overdueDays)
      .slice(0, 8);
  }, [overdueOrders, overdueRequests]);

  const serviceCommitments = useMemo<ServiceCommitmentSummary[]>(() => {
    const grouped = new Map<string, ServiceCommitmentSummary>();

    filteredCommitments.forEach((commitment) => {
      const serviceName = commitment.serviceName || 'Non attribue';
      const existing = grouped.get(serviceName) || {
        serviceName,
        totalAmount: 0,
        quoteCount: 0,
        orderCount: 0,
        pendingAmount: 0,
        overdueOrders: 0,
      };

      existing.totalAmount += commitment.amountTTC || 0;
      if (commitment.sourceType === 'PURCHASE_QUOTE') {
        existing.quoteCount += 1;
        if (commitment.status === 'SOUMISE') {
          existing.pendingAmount += commitment.amountTTC || 0;
        }
      } else {
        existing.orderCount += 1;
      }

      grouped.set(serviceName, existing);
    });

    overdueOrders.forEach((order) => {
      const serviceName = order.serviceName || 'Non attribue';
      const existing = grouped.get(serviceName) || {
        serviceName,
        totalAmount: 0,
        quoteCount: 0,
        orderCount: 0,
        pendingAmount: 0,
        overdueOrders: 0,
      };
      existing.overdueOrders += 1;
      grouped.set(serviceName, existing);
    });

    return Array.from(grouped.values()).sort((left, right) => right.totalAmount - left.totalAmount);
  }, [filteredCommitments, overdueOrders]);

  const topServiceAmount = serviceCommitments[0]?.totalAmount || 1;

  const kpis = useMemo(
    () => [
      {
        key: 'drafts' as const,
        label: 'Devis brouillon',
        value: draftRequests.length,
        description: 'A completer avant soumission',
        icon: FileText,
        accent: 'text-slate-700',
      },
        {
          key: 'approval' as const,
          label: 'Validations DG',
          value: pendingApprovalRequests.length + pendingProformaApprovals.length,
          description: 'DPA et proformas a arbitrer',
        icon: FileClock,
        accent: 'text-amber-600',
      },
      {
        key: 'rejected' as const,
        label: 'Devis rejetes',
        value: rejectedRequests.length,
        description: 'Demandes a retravailler',
        icon: XCircle,
        accent: 'text-rose-600',
      },
      {
        key: 'converted' as const,
        label: 'Devis convertis',
        value: convertedRequests.length,
        description: 'Devis passes en bon de commande',
        icon: CheckCircle2,
        accent: 'text-emerald-600',
      },
      {
        key: 'orders' as const,
        label: 'BC actifs',
        value: activeOrders.length,
        description: 'Brouillons, envoyes ou confirms',
        icon: ShoppingCart,
        accent: 'text-blue-600',
      },
      {
        key: 'overdue' as const,
        label: 'Alertes retard',
        value: alertItems.length,
        description: 'Soumissions ou livraisons hors delai',
        icon: AlertTriangle,
        accent: 'text-red-600',
      },
      {
        key: 'commitments' as const,
        label: 'Engagement total',
        value: formatCurrency(filteredCommitments.reduce((sum, item) => sum + (item.amountTTC || 0), 0)),
        description: 'Lecture finance consolidee',
        icon: Boxes,
        accent: 'text-purple-600',
      },
    ],
    [
      activeOrders.length,
      alertItems.length,
      convertedRequests.length,
      draftRequests.length,
      filteredCommitments,
      pendingApprovalRequests.length,
      pendingProformaApprovals.length,
      rejectedRequests.length,
    ]
  );

  const focusTitle = useMemo(() => {
    switch (focus) {
      case 'drafts':
        return 'Drill-down sur les DPA brouillon';
      case 'approval':
        return 'Drill-down sur la file d approbation';
      case 'rejected':
        return 'Drill-down sur les DPA rejetees';
      case 'converted':
        return 'Drill-down sur les DPA converties en bon de commande';
      case 'orders':
        return 'Drill-down sur les bons de commande actifs';
      case 'overdue':
        return 'Drill-down sur les alertes de retard';
      case 'commitments':
        return 'Drill-down sur les engagements achats';
      default:
        return 'Drill-down achats';
    }
  }, [focus]);

  const focusRequests = useMemo(() => {
    switch (focus) {
      case 'drafts':
        return draftRequests;
      case 'approval':
        return pendingApprovalRequests;
      case 'rejected':
        return rejectedRequests;
      case 'converted':
        return convertedRequests;
      case 'overdue':
        return overdueRequests;
      default:
        return filteredRequests.slice(0, 12);
    }
  }, [convertedRequests, draftRequests, filteredRequests, focus, overdueRequests, pendingApprovalRequests, rejectedRequests]);

  const focusOrders = useMemo(() => {
    switch (focus) {
      case 'orders':
        return activeOrders;
      case 'overdue':
        return overdueOrders;
      default:
        return filteredOrders.slice(0, 12);
    }
  }, [activeOrders, filteredOrders, focus, overdueOrders]);

  const focusCommitments = useMemo(() => {
    if (focus === 'commitments') {
      return filteredCommitments;
    }
    return filteredCommitments.slice(0, 10);
  }, [filteredCommitments, focus]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Achats</h1>
          <p className="text-sm text-muted-foreground">
            Pilotage du pipeline achats: DPA, proformas, approbations DG, bons de commande, retards et engagements financiers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/achats/devis">DPA internes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/achats/proformas">Proformas fournisseurs</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/achats/commandes">Bons de commande</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/achats/receptions">Receptions</Link>
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/dashboard/achats/devis">
                <PackagePlus className="mr-2 h-4 w-4" />
                Nouvelle DPA
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[2fr,1fr]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par numero, service, fournisseur ou statut..."
          />
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les services" />
            </SelectTrigger>
            <SelectContent>
              {availableServices.map((serviceName) => (
                <SelectItem key={serviceName} value={serviceName}>
                  {serviceName === 'ALL' ? 'Tous les services' : serviceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              const isActive = focus === kpi.key;
              return (
                <button
                  key={kpi.key}
                  type="button"
                  onClick={() => setFocus(kpi.key)}
                  className="text-left"
                >
                  <Card className={isActive ? 'border-blue-500 ring-1 ring-blue-500' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">{kpi.label}</div>
                          <div className={`mt-2 text-2xl font-bold ${kpi.accent}`}>{kpi.value}</div>
                          <div className="mt-2 text-xs text-muted-foreground">{kpi.description}</div>
                        </div>
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Alertes critiques</CardTitle>
                <CardDescription>Retards d approbation et livraisons a traiter en priorite.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alertItems.length === 0 ? (
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Aucune alerte critique</AlertTitle>
                    <AlertDescription>
                      Aucune DPA soumise, proforma soumise ou bon de commande actif ne depasse les seuils de retard.
                    </AlertDescription>
                  </Alert>
                ) : (
                  alertItems.slice(0, 3).map((item) => (
                    <Alert key={`${item.type}-${item.id}`} variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>
                        {item.type === 'QUOTE' ? 'Devis en attente d approbation' : 'Bon de commande en retard'}
                      </AlertTitle>
                      <AlertDescription>
                        <div className="space-y-1">
                          <p>
                            <strong>{item.number}</strong> · {item.label}
                          </p>
                          <p>
                            Service: {item.serviceName} · Fournisseur: {item.supplierName}
                          </p>
                          <p>
                            Retard: {item.overdueDays} jour(s) · Montant: {formatCurrency(item.amount)}
                          </p>
                          <div className="pt-1">
                            <Button asChild size="sm" variant="outline">
                              <Link href={item.href}>Ouvrir</Link>
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagements par service</CardTitle>
                <CardDescription>Lecture finance consolidee issue du read model billing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviceCommitments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aucun engagement achat disponible pour le filtre courant.
                  </div>
                ) : (
                  serviceCommitments.slice(0, 5).map((summary) => (
                    <div key={summary.serviceName} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">{summary.serviceName}</div>
                          <div className="text-xs text-muted-foreground">
                            {summary.quoteCount} DPA · {summary.orderCount} BC · {summary.overdueOrders} retard(s)
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold">
                          {formatCurrency(summary.totalAmount)}
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{
                            width: `${Math.max(8, Math.round((summary.totalAmount / topServiceAmount) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="approvals" className="space-y-4">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="approvals">File d&apos;approbation</TabsTrigger>
              <TabsTrigger value="alerts">Retards</TabsTrigger>
              <TabsTrigger value="commitments">Engagements</TabsTrigger>
              <TabsTrigger value="drilldown">Drill-down</TabsTrigger>
            </TabsList>

            <TabsContent value="approvals">
              <Card>
                <CardHeader>
                  <CardTitle>DPA a approuver</CardTitle>
                  <CardDescription>
                    File actionnable par service avec approbation ou rejet immediat.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numero</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Montant TTC</TableHead>
                        <TableHead>Soumis le</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovalRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.number}</TableCell>
                          <TableCell>{request.serviceName || 'Non attribue'}</TableCell>
                          <TableCell>{request.supplierName || '-'}</TableCell>
                          <TableCell>{formatCurrency(request.montantTTC || request.estimatedAmount || 0)}</TableCell>
                          <TableCell>{formatDate(request.submittedAt || request.date)}</TableCell>
                          <TableCell>{daysBetween(request.submittedAt || request.date)} jour(s)</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/dashboard/achats/devis/${request.id}`}>Ouvrir</Link>
                              </Button>
                              {(canApprove || canReject) && (
                                <>
                                  {canApprove && (
                                    <Button
                                      size="sm"
                                      onClick={() => approveMutation.mutate(request.id)}
                                      disabled={approveMutation.isPending}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Approuver
                                    </Button>
                                  )}
                                  {canReject && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRejectTarget(request)}
                                      disabled={rejectMutation.isPending}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Rejeter
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pendingApprovalRequests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            Aucune DPA en attente d approbation pour le filtre courant.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>DPA soumises hors SLA</CardTitle>
                    <CardDescription>Soumis depuis plus de 48h sans approbation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numero</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead>Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.number}</TableCell>
                            <TableCell>{request.serviceName || 'Non attribue'}</TableCell>
                            <TableCell>{request.supplierName || '-'}</TableCell>
                            <TableCell>{daysBetween(request.submittedAt || request.date)} jour(s)</TableCell>
                            <TableCell>{formatCurrency(request.montantTTC || request.estimatedAmount || 0)}</TableCell>
                          </TableRow>
                        ))}
                        {overdueRequests.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                              Aucune DPA hors SLA.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Livraisons en retard</CardTitle>
                    <CardDescription>Bons de commande actifs depassant la date de livraison prevue.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numero BC</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead>Retard</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.number}</TableCell>
                            <TableCell>{order.serviceName || 'Non attribue'}</TableCell>
                            <TableCell>{order.supplier || order.fournisseurNom || '-'}</TableCell>
                            <TableCell>{daysBetween(order.deliveryDate)} jour(s)</TableCell>
                            <TableCell>
                              <Badge variant={getOrderStatusVariant(order.status)}>
                                {orderStatusLabels[order.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {overdueOrders.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                              Aucun bon de commande en retard.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="commitments">
              <div className="grid gap-4 xl:grid-cols-[1fr,1.4fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Synthese par service</CardTitle>
                    <CardDescription>Montants engages et exposition au retard.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Devis</TableHead>
                          <TableHead>BC</TableHead>
                          <TableHead>Retards</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceCommitments.map((summary) => (
                          <TableRow key={summary.serviceName}>
                            <TableCell className="font-medium">{summary.serviceName}</TableCell>
                            <TableCell>{summary.quoteCount}</TableCell>
                            <TableCell>{summary.orderCount}</TableCell>
                            <TableCell>{summary.overdueOrders}</TableCell>
                            <TableCell className="text-right">{formatCurrency(summary.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                        {serviceCommitments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                              Aucun engagement disponible.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lecture finance detaillee</CardTitle>
                    <CardDescription>Read model billing des DPA, proformas retenues et bons de commande achats.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Numero</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCommitments.map((commitment) => (
                          <TableRow key={commitment.id}>
                            <TableCell>{commitment.sourceType === 'PURCHASE_QUOTE' ? 'DPA' : 'Bon de commande'}</TableCell>
                            <TableCell className="font-medium">{commitment.sourceNumber}</TableCell>
                            <TableCell>{commitment.serviceName || 'Non attribue'}</TableCell>
                            <TableCell>{commitment.supplierName || '-'}</TableCell>
                            <TableCell>{commitment.status}</TableCell>
                            <TableCell className="text-right">{formatCurrency(commitment.amountTTC || 0)}</TableCell>
                          </TableRow>
                        ))}
                        {filteredCommitments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                              Aucun engagement achats ne correspond au filtre courant.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="drilldown">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>{focusTitle}</CardTitle>
                      <CardDescription>
                        Clique sur un KPI pour changer la perspective d analyse et descendre dans le detail.
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setFocus('approval')}>
                      Revenir sur la file d approbation
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {focus !== 'commitments' && (
                    <>
                      <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          DPA
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Numero</TableHead>
                              <TableHead>Objet</TableHead>
                              <TableHead>Service</TableHead>
                              <TableHead>Fournisseur</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {focusRequests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell className="font-medium">{request.number}</TableCell>
                                <TableCell>{request.objet || request.title}</TableCell>
                                <TableCell>{request.serviceName || 'Non attribue'}</TableCell>
                                <TableCell>{request.supplierName || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant={getRequestStatusVariant(request.status)}>
                                    {requestStatusLabels[request.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(request.montantTTC || request.estimatedAmount || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {focusRequests.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                  Aucune DPA pour cette vue detaillee.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Bons de commande
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Numero BC</TableHead>
                              <TableHead>Service</TableHead>
                              <TableHead>Fournisseur</TableHead>
                              <TableHead>Livraison prevue</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {focusOrders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.number}</TableCell>
                                <TableCell>{order.serviceName || 'Non attribue'}</TableCell>
                                <TableCell>{order.supplier || order.fournisseurNom || '-'}</TableCell>
                                <TableCell>{formatDate(order.deliveryDate)}</TableCell>
                                <TableCell>
                                  <Badge variant={getOrderStatusVariant(order.status)}>
                                    {orderStatusLabels[order.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(order.montantTotal || order.amount || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {focusOrders.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                  Aucun bon de commande pour cette vue detaillee.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}

                  {focus === 'commitments' && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Engagements finances
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Numero</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Fournisseur</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {focusCommitments.map((commitment: PurchaseCommitment) => (
                            <TableRow key={commitment.id}>
                              <TableCell>{commitment.sourceType === 'PURCHASE_QUOTE' ? 'DPA' : 'BC'}</TableCell>
                              <TableCell className="font-medium">{commitment.sourceNumber}</TableCell>
                              <TableCell>{commitment.serviceName || 'Non attribue'}</TableCell>
                              <TableCell>{commitment.supplierName || '-'}</TableCell>
                              <TableCell>{commitment.status}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(commitment.amountTTC || 0)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {focusCommitments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                Aucun engagement finance pour cette vue detaillee.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Parcours metier couvert</CardTitle>
              <CardDescription>
                Le dashboard suit le cycle complet DPA → validation DG → proformas → bon de commande → engagement financier.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Creation
                </div>
                <p className="text-sm text-muted-foreground">
                  Les DPA sont créées par service avec fournisseur, prix et quantités.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Clock3 className="h-4 w-4" />
                  Approbation
                </div>
                <p className="text-sm text-muted-foreground">
                  La DG valide d abord la DPA, puis la proforma retenue par le service achat.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <ShoppingCart className="h-4 w-4" />
                  Execution
                </div>
                <p className="text-sm text-muted-foreground">
                  Après validation de la proforma, le service achat génère le bon de commande puis alimente le suivi logistique.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <PackageCheck className="h-4 w-4" />
                  Finance
                </div>
                <p className="text-sm text-muted-foreground">
                  Les engagements par service sont remontes cote billing via le read model event-driven.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <RejectPurchaseRequestDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        requestNumber={rejectTarget?.number}
        isPending={rejectMutation.isPending}
        onConfirm={(commentaire) => {
          if (!rejectTarget) return;
          rejectMutation.mutate(
            { id: rejectTarget.id, commentaire },
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
