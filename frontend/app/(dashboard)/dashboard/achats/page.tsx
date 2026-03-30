'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRightLeft,
  ClipboardCheck,
  Clock,
  FileCheck,
  FileText,
  PackageCheck,
  Receipt,
  ShoppingCart,
  Truck,
  Warehouse,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { procurementService } from '@/services/procurement';
import type { PurchaseOrderStatus, PurchaseRequest, PurchaseRequestStatus } from '@/services/procurement';
import { billingService, type PurchaseCommitment } from '@/shared/api/billing';

const REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise DG',
  APPROUVEE: 'Validée DG',
  REJETEE: 'Rejetée',
  PROFORMAS_EN_COURS: 'Proformas en cours',
  PROFORMA_SOUMISE: 'Proforma soumise',
  PROFORMA_APPROUVEE: 'Proforma validée',
  COMMANDEE: 'Convertie en BC',
};

const REQUEST_COLORS: Record<PurchaseRequestStatus, string> = {
  BROUILLON: '#94a3b8',
  SOUMISE: '#f59e0b',
  APPROUVEE: '#16a34a',
  REJETEE: '#dc2626',
  PROFORMAS_EN_COURS: '#7c3aed',
  PROFORMA_SOUMISE: '#fb923c',
  PROFORMA_APPROUVEE: '#0f766e',
  COMMANDEE: '#2563eb',
};

const ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyée',
  CONFIRME: 'Confirmée',
  LIVRE: 'Livrée',
  ANNULE: 'Annulée',
};

const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  BROUILLON: 'outline',
  SOUMISE: 'secondary',
  APPROUVEE: 'default',
  REJETEE: 'destructive',
  PROFORMAS_EN_COURS: 'secondary',
  PROFORMA_SOUMISE: 'secondary',
  PROFORMA_APPROUVEE: 'default',
  COMMANDEE: 'default',
  ENVOYE: 'secondary',
  CONFIRME: 'default',
  LIVRE: 'default',
  ANNULE: 'destructive',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

const formatCompactCurrency = (value: number) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md F`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M F`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} k F`;
  return `${amount} F`;
};

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

const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];

const overdueOrderStatuses: PurchaseOrderStatus[] = ['BROUILLON', 'ENVOYE', 'CONFIRME'];

export default function ProcurementDashboardPage() {
  const [serviceFilter, setServiceFilter] = useState('ALL');

  const { data: requestsResponse, isLoading: requestsLoading } = useQuery({
    queryKey: ['procurement-dashboard-requests-v2'],
    queryFn: () => procurementService.getRequests({ limit: 200 }),
  });

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['procurement-dashboard-orders-v2'],
    queryFn: () => procurementService.getOrders({ limit: 200 }),
  });

  const { data: commitmentsResponse, isLoading: commitmentsLoading } = useQuery({
    queryKey: ['procurement-dashboard-commitments-v2'],
    queryFn: () => billingService.getPurchaseCommitments(),
  });

  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['procurement-dashboard-stats-v2'],
    queryFn: () => billingService.getPurchaseCommitmentsStats(),
  });

  const requests = requestsResponse?.data ?? [];
  const orders = ordersResponse?.data ?? [];
  const commitments = commitmentsResponse?.data ?? [];
  const stats = statsResponse?.data;
  const isLoading = requestsLoading || ordersLoading || commitmentsLoading || statsLoading;

  const availableServices = useMemo(() => {
    const names = new Set<string>();
    [...requests, ...orders, ...commitments].forEach((item: any) => {
      const serviceName = String(item?.serviceName || '').trim();
      if (serviceName) names.add(serviceName);
    });
    return ['ALL', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [requests, orders, commitments]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => serviceFilter === 'ALL' || (request.serviceName || 'Non attribué') === serviceFilter),
    [requests, serviceFilter]
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => serviceFilter === 'ALL' || (order.serviceName || 'Non attribué') === serviceFilter),
    [orders, serviceFilter]
  );

  const filteredCommitments = useMemo(
    () =>
      commitments.filter(
        (commitment) => serviceFilter === 'ALL' || (commitment.serviceName || 'Non attribué') === serviceFilter
      ),
    [commitments, serviceFilter]
  );

  const draftRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'BROUILLON'),
    [filteredRequests]
  );

  const pendingApprovals = useMemo(
    () =>
      filteredRequests.filter((request) =>
        ['SOUMISE', 'PROFORMA_SOUMISE'].includes(request.status)
      ),
    [filteredRequests]
  );

  const convertedRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'COMMANDEE'),
    [filteredRequests]
  );

  const activeOrders = useMemo(
    () => filteredOrders.filter((order) => overdueOrderStatuses.includes(order.status)),
    [filteredOrders]
  );

  const receivedOrders = useMemo(
    () => filteredOrders.filter((order) => order.status === 'LIVRE'),
    [filteredOrders]
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

  const dueSoonOrders = useMemo(
    () =>
      activeOrders.filter((order) => {
        const remaining = daysUntil(order.deliveryDate);
        return remaining != null && remaining >= 0 && remaining <= 7;
      }),
    [activeOrders]
  );

  const averageLeadTime = useMemo(() => {
    const samples = filteredOrders
      .filter((order) => order.date && order.deliveryDate)
      .map((order) => {
        const start = new Date(order.date ?? '');
        const end = new Date(order.deliveryDate ?? '');
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
        return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      })
      .filter((value): value is number => value != null);

    if (!samples.length) return 0;
    return Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
  }, [filteredOrders]);

  const conversionRate = useMemo(() => {
    if (!filteredRequests.length) return 0;
    return Math.round((convertedRequests.length / filteredRequests.length) * 100);
  }, [convertedRequests.length, filteredRequests.length]);

  const totalEngagement = useMemo(
    () => filteredCommitments.reduce((sum, item) => sum + Number(item.amountTTC || 0), 0),
    [filteredCommitments]
  );

  const kpis = useMemo(
    () => [
      {
        label: 'Devis internes',
        value: String(filteredRequests.length),
        helper: `${draftRequests.length} brouillon / ${pendingApprovals.length} à valider`,
      },
      {
        label: 'Engagement achats',
        value: formatCurrency(totalEngagement),
        helper: `${formatCurrency(stats?.totalCommittedAmount || 0)} engagés`,
      },
      {
        label: 'Délai moyen',
        value: `${averageLeadTime} j`,
        helper: `${dueSoonOrders.length} livraisons prévues < 7 jours`,
      },
      {
        label: 'Alertes critiques',
        value: String(overdueOrders.length),
        helper: `${overdueOrders.length ? overdueOrders[0]?.number || '' : 'Aucun retard critique'}`,
      },
      {
        label: 'Taux de conversion',
        value: `${conversionRate}%`,
        helper: `${convertedRequests.length} devis convertis`,
      },
      {
        label: 'Commandes actives',
        value: String(activeOrders.length),
        helper: `${receivedOrders.length} livrées`,
      },
    ],
    [
      activeOrders.length,
      averageLeadTime,
      conversionRate,
      convertedRequests.length,
      draftRequests.length,
      dueSoonOrders.length,
      filteredRequests.length,
      overdueOrders.length,
      pendingApprovals.length,
      receivedOrders.length,
      stats?.totalCommittedAmount,
      totalEngagement,
    ]
  );

  const requestStatusData = useMemo(
    () =>
      (Object.keys(REQUEST_STATUS_LABELS) as PurchaseRequestStatus[])
        .map((status) => ({
          name: REQUEST_STATUS_LABELS[status],
          value: filteredRequests.filter((request) => request.status === status).length,
          color: REQUEST_COLORS[status],
        }))
        .filter((item) => item.value > 0),
    [filteredRequests]
  );

  const serviceExposureData = useMemo(() => {
    const grouped = filteredCommitments.reduce<Record<string, number>>((accumulator, commitment) => {
      const key = commitment.serviceName || 'Non attribué';
      accumulator[key] = (accumulator[key] || 0) + Number(commitment.amountTTC || 0);
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 6);
  }, [filteredCommitments]);

  const supplierExposureData = useMemo(() => {
    const grouped = filteredCommitments.reduce<Record<string, number>>((accumulator, commitment) => {
      const key = commitment.supplierName || 'Sans fournisseur';
      accumulator[key] = (accumulator[key] || 0) + Number(commitment.amountTTC || 0);
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [filteredCommitments]);

  const engagementTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        key,
        label: monthLabels[date.getMonth()],
        start: date,
      };
    });

    const totals = months.map((month) => {
      const amount = filteredCommitments.reduce((sum, commitment) => {
        if (!commitment.createdAt) return sum;
        const created = new Date(commitment.createdAt);
        if (Number.isNaN(created.getTime())) return sum;
        const monthKey = `${created.getFullYear()}-${created.getMonth()}`;
        return monthKey === month.key ? sum + Number(commitment.amountTTC || 0) : sum;
      }, 0);
      return { month: month.label, amount };
    });

    return totals;
  }, [filteredCommitments]);

  const criticalAlerts = useMemo(
    () =>
      overdueOrders.slice(0, 4).map((order) => ({
        id: order.id,
        number: order.number,
        serviceName: order.serviceName || 'Non attribué',
        supplierName: order.supplier || order.fournisseurNom || '-',
        amount: order.montantTotal || order.amount || 0,
        overdueDays: daysBetween(order.deliveryDate),
      })),
    [overdueOrders]
  );

  const pendingDecisions = useMemo(
    () =>
      pendingApprovals
        .sort((left, right) => daysBetween(right.submittedAt || right.date) - daysBetween(left.submittedAt || left.date))
        .slice(0, 6),
    [pendingApprovals]
  );

  const modules = [
    {
      title: 'Devis internes',
      description: 'Saisie des besoins, validation DG et révisions de la demande.',
      href: '/dashboard/achats/devis',
      icon: FileText,
    },
    {
      title: 'Proformas fournisseurs',
      description: 'Comparatif achat, commission, choix fournisseur et arbitrage.',
      href: '/dashboard/achats/proformas',
      icon: FileCheck,
    },
    {
      title: 'Commandes d’achat',
      description: 'Bons de commande, suivi d’exécution et lien comptable.',
      href: '/dashboard/achats/commandes',
      icon: ShoppingCart,
    },
    {
      title: 'Réceptions',
      description: 'Contrôle des livraisons et rapprochement commande / réception.',
      href: '/dashboard/achats/receptions',
      icon: PackageCheck,
    },
    {
      title: 'Stocks',
      description: 'Catalogue, inventaire, disponibilité et audit logistique.',
      href: '/dashboard/achats/stock',
      icon: Warehouse,
    },
  ];

  if (isLoading) {
    return (
      <Card className="p-10">
        <div className="flex justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Achats</h1>
          <p className="mt-2 text-muted-foreground">
            Vue de pilotage des devis internes, proformas, commandes, réceptions et engagements
            achats avec lecture financière et logistique.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {availableServices.map((serviceName) => (
              <option key={serviceName} value={serviceName}>
                {serviceName === 'ALL' ? 'Tous les services' : serviceName}
              </option>
            ))}
          </select>
          <Button variant="outline" asChild>
            <Link href="/dashboard/achats/proformas">Voir les proformas</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/achats/devis">Ouvrir les devis</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold">{kpi.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{kpi.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Pipeline achats</h2>
            <p className="text-sm text-muted-foreground">
              Répartition des devis internes par étape métier, de la création à la conversion en bon de commande.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={requestStatusData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
              >
                {requestStatusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} devis`, 'Volume']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid gap-3 md:grid-cols-2">
            {requestStatusData.map((item) => (
              <div key={item.name} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
                <div className="mt-2 text-xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Exposition par service</h2>
            <p className="text-sm text-muted-foreground">
              Montants engagés par service pour arbitrer les besoins et la pression budgétaire.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={serviceExposureData} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Fournisseurs les plus exposés</h2>
            <p className="text-sm text-muted-foreground">
              Montants cumulés par fournisseur sur les engagements et commandes en cours.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={supplierExposureData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Délais & exécution</h2>
            <p className="text-sm text-muted-foreground">Pilotage des délais de livraison et de la pression opérationnelle.</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-amber-600" />
                Délai moyen de livraison
              </div>
              <div className="mt-2 text-2xl font-semibold">{averageLeadTime} j</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4 text-red-600" />
                Livraisons en retard
              </div>
              <div className="mt-2 text-2xl font-semibold">{overdueOrders.length}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                Décisions en attente
              </div>
              <div className="mt-2 text-2xl font-semibold">{pendingApprovals.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">{dueSoonOrders.length} livraisons prévues sous 7 jours.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Engagements mensuels</h2>
            <p className="text-sm text-muted-foreground">Lecture financière des engagements achats sur les 6 derniers mois.</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#0f766e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Signal de pilotage</h2>
            <p className="text-sm text-muted-foreground">Points d'attention immédiats pour la direction achats.</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Alertes critiques
              </div>
              <div className="mt-2 text-2xl font-semibold">{overdueOrders.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {overdueOrders.length ? 'Commandes avec livraison dépassée.' : 'Aucune commande en retard.'}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                Engagements actifs
              </div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalEngagement)}</div>
              <p className="mt-2 text-xs text-muted-foreground">{conversionRate}% des devis internes convertis en BC.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.title} className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                Module Achats
              </div>
              <h3 className="mt-3 text-lg font-semibold">{module.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href={module.href}>Ouvrir</Link>
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Alertes critiques</h2>
              <p className="text-sm text-muted-foreground">
                Bons de commande dont la livraison prévue est dépassée.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/achats/commandes">Voir les commandes</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {criticalAlerts.length ? (
              criticalAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{alert.number}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.serviceName} · {alert.supplierName}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      {alert.overdueDays} j
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(alert.amount)}</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/achats/commandes?selectedOrderId=${alert.id}`}>Ouvrir</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Aucune alerte critique sur les commandes.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Décisions à prendre</h2>
              <p className="text-sm text-muted-foreground">
                Devis internes et proformas encore en attente d’arbitrage DG.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/approbations/achats">Aller aux validations</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {pendingDecisions.length ? (
              pendingDecisions.map((request: PurchaseRequest) => (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{request.number}</p>
                      <p className="text-sm text-muted-foreground">{request.objet || request.title}</p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANTS[request.status] || 'outline'}>
                      {REQUEST_STATUS_LABELS[request.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {request.serviceName || 'Non attribué'} · {daysBetween(request.submittedAt || request.date)} jour(s)
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/achats/devis/${request.id}`}>Ouvrir</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Aucune décision en attente pour le filtre courant.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Pont vers la comptabilité</h2>
            <p className="text-sm text-muted-foreground">
              Les engagements achats alimentent les bons de caisse et la trésorerie.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/comptabilite/depenses">
              <Receipt className="mr-2 h-4 w-4" />
              Voir les bons de caisse
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
