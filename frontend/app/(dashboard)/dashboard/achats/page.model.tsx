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

// État, chargement et actions du parcours d'interface.


export const REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise PDG',
  APPROUVEE: 'Validée PDG',
  REJETEE: 'Rejetée',
  PROFORMAS_EN_COURS: 'Proformas en cours',
  PROFORMA_SOUMISE: 'Proforma soumise',
  PROFORMA_APPROUVEE: 'Proforma validée',
  COMMANDEE: 'Convertie en BC',
};



export const REQUEST_COLORS: Record<PurchaseRequestStatus, string> = {
  BROUILLON: '#94a3b8',
  SOUMISE: '#f59e0b',
  APPROUVEE: '#16a34a',
  REJETEE: '#dc2626',
  PROFORMAS_EN_COURS: '#7c3aed',
  PROFORMA_SOUMISE: '#fb923c',
  PROFORMA_APPROUVEE: '#0f766e',
  COMMANDEE: '#2563eb',
};



export const ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyée',
  CONFIRME: 'Confirmée',
  LIVRE: 'Livrée',
  ANNULE: 'Annulée',
};



export const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
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



export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');



export const formatCompactCurrency = (value: number) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md F`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M F`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} k F`;
  return `${amount} F`;
};



export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-FR');
};



export const daysBetween = (from?: string | null, to = new Date()) => {
  if (!from) return 0;
  const parsed = new Date(from);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, Math.floor((to.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
};



export const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};



export const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];



export const overdueOrderStatuses: PurchaseOrderStatus[] = ['BROUILLON', 'ENVOYE', 'CONFIRME'];

export function useProcurementDashboardPageModel() {

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
      const enterpriseName = String(item?.enterpriseName || '').trim();
      if (enterpriseName) names.add(enterpriseName);
    });
    return ['ALL', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [requests, orders, commitments]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => serviceFilter === 'ALL' || (request.enterpriseName || 'Non attribuée') === serviceFilter),
    [requests, serviceFilter]
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => serviceFilter === 'ALL' || (order.enterpriseName || 'Non attribuée') === serviceFilter),
    [orders, serviceFilter]
  );

  const filteredCommitments = useMemo(
    () =>
      commitments.filter(
        (commitment) => serviceFilter === 'ALL' || (commitment.enterpriseName || 'Non attribuée') === serviceFilter
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
      const key = commitment.enterpriseName || 'Non attribuée';
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
        enterpriseName: order.enterpriseName || 'Non attribuée',
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
      description: 'Saisie des besoins, validation PDG et révisions de la demande.',
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
  return {
    serviceFilter,
    setServiceFilter,
    requestsResponse,
    requestsLoading,
    ordersResponse,
    ordersLoading,
    commitmentsResponse,
    commitmentsLoading,
    statsResponse,
    statsLoading,
    requests,
    orders,
    commitments,
    stats,
    isLoading,
    availableServices,
    filteredRequests,
    filteredOrders,
    filteredCommitments,
    draftRequests,
    pendingApprovals,
    convertedRequests,
    activeOrders,
    receivedOrders,
    overdueOrders,
    dueSoonOrders,
    averageLeadTime,
    conversionRate,
    totalEngagement,
    kpis,
    requestStatusData,
    serviceExposureData,
    supplierExposureData,
    engagementTrend,
    criticalAlerts,
    pendingDecisions,
    modules,
  };
}
