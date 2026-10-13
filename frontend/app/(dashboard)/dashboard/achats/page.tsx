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
import { REQUEST_STATUS_LABELS, REQUEST_COLORS, ORDER_STATUS_LABELS, STATUS_BADGE_VARIANTS, formatCurrency, formatCompactCurrency, formatDate, daysBetween, daysUntil, monthLabels, overdueOrderStatuses, useProcurementDashboardPageModel } from './page.model';

export default function ProcurementDashboardPage() {  const { serviceFilter, setServiceFilter, requestsResponse, requestsLoading, ordersResponse, ordersLoading, commitmentsResponse, commitmentsLoading, statsResponse, statsLoading, requests, orders, commitments, stats, isLoading, availableServices, filteredRequests, filteredOrders, filteredCommitments, draftRequests, pendingApprovals, convertedRequests, activeOrders, receivedOrders, overdueOrders, dueSoonOrders, averageLeadTime, conversionRate, totalEngagement, kpis, requestStatusData, serviceExposureData, supplierExposureData, engagementTrend, criticalAlerts, pendingDecisions, modules } = useProcurementDashboardPageModel();



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
                {serviceName === 'ALL' ? 'Toutes les entreprises' : serviceName}
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
            <h2 className="text-xl font-semibold">Exposition par entreprise</h2>
            <p className="text-sm text-muted-foreground">
              Montants engagés par entreprise pour arbitrer les besoins et la pression budgétaire.
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
                        {alert.enterpriseName} · {alert.supplierName}
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
                Devis internes et proformas encore en attente d’arbitrage PDG.
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
                      {request.enterpriseName || 'Non attribuée'} · {daysBetween(request.submittedAt || request.date)} jour(s)
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
