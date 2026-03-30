'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowUpRight,
  FileText,
  Filter,
  PieChart,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { commercialService } from '@/shared/api/commercial';
import { billingService } from '@/shared/api/billing';

type PeriodFilter = '7j' | '30j' | '90j' | '12m' | 'annee';
const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '7j': '7 jours',
  '30j': '30 jours',
  '90j': '90 jours',
  '12m': '12 mois',
  annee: 'Année en cours',
};

const STAGE_LABELS: Record<string, string> = {
  preparation: 'Préparation',
  research: 'Recherche',
  contact: 'Contact initial',
  discovery: 'Découverte',
  proposal: 'Proposition',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
  on_hold: 'En attente',
};

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  MODIFICATION_DEMANDEE: 'Modif. demandée',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  EXPIRE: 'Expiré',
  TRANSMIS_FACTURATION: 'Transmis',
  FACTURE: 'Facturé',
};

const STATUS_COLORS: Record<string, string> = {
  BROUILLON: '#94a3b8',
  ENVOYE: '#2563eb',
  MODIFICATION_DEMANDEE: '#f97316',
  ACCEPTE: '#16a34a',
  REFUSE: '#dc2626',
  EXPIRE: '#e11d48',
  TRANSMIS_FACTURATION: '#0ea5e9',
  FACTURE: '#7c3aed',
};

export default function CommercialDashboardPage() {
  const [period, setPeriod] = useState<PeriodFilter>('30j');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [commercialFilter, setCommercialFilter] = useState<string>('all');

  const { data: prospects = [], isLoading: prospectsLoading } = useQuery({
    queryKey: ['commercial-dashboard-prospects'],
    queryFn: () => commercialService.getProspects({ limit: 200 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['commercial-dashboard-stats'],
    queryFn: () => commercialService.getStats(),
  });

  const { data: quotesResponse, isLoading: quotesLoading } = useQuery({
    queryKey: ['commercial-dashboard-quotes'],
    queryFn: () => billingService.getQuotes({ limit: 200 }),
  });

  const quotes = quotesResponse?.data ?? [];

  const filterStartDate = useMemo(() => {
    const now = new Date();
    if (period === 'annee') {
      return new Date(now.getFullYear(), 0, 1);
    }
    if (period === '12m') {
      const copy = new Date(now);
      copy.setMonth(copy.getMonth() - 11);
      return new Date(copy.getFullYear(), copy.getMonth(), 1);
    }
    const days = period === '7j' ? 7 : period === '30j' ? 30 : 90;
    const copy = new Date(now);
    copy.setDate(copy.getDate() - (days - 1));
    return new Date(copy.getFullYear(), copy.getMonth(), copy.getDate());
  }, [period]);

  const normalizedQuotes = useMemo(
    () =>
      quotes.map((quote: any) => ({
        ...quote,
        effectiveDate: new Date(quote.dateDevis || quote.createdAt || Date.now()),
      })),
    [quotes]
  );

  const filteredQuotes = useMemo(
    () =>
      normalizedQuotes.filter((quote: any) => {
        if (!quote.effectiveDate || Number.isNaN(quote.effectiveDate.getTime())) return false;
        if (quote.effectiveDate < filterStartDate) return false;
        if (serviceFilter !== 'all' && quote.serviceName !== serviceFilter) return false;
        const commercialName =
          quote.commercialName || quote.commercial?.name || quote.createdByEmail || quote.createdById || 'Non attribué';
        if (commercialFilter !== 'all' && commercialName !== commercialFilter) return false;
        return true;
      }),
    [normalizedQuotes, filterStartDate, serviceFilter, commercialFilter]
  );

  const filteredProspects = useMemo(
    () =>
      prospects.filter((prospect: any) => {
        const created = new Date(prospect.createdAt || Date.now());
        if (Number.isNaN(created.getTime())) return false;
        return created >= filterStartDate;
      }),
    [prospects, filterStartDate]
  );

  const totalQuoteValue = filteredQuotes.reduce((sum: number, quote: any) => sum + (quote.montantTTC || 0), 0);
  const pendingQuotes = filteredQuotes.filter((quote: any) =>
    ['BROUILLON', 'ENVOYE', 'MODIFICATION_DEMANDEE'].includes(quote.status)
  );
  const acceptedQuotes = filteredQuotes.filter((quote: any) =>
    ['ACCEPTE', 'TRANSMIS_FACTURATION', 'FACTURE'].includes(quote.status)
  );
  const refusedQuotes = filteredQuotes.filter((quote: any) => ['REFUSE'].includes(quote.status));
  const winRate =
    acceptedQuotes.length + refusedQuotes.length > 0
      ? (acceptedQuotes.length / (acceptedQuotes.length + refusedQuotes.length)) * 100
      : 0;

  const conversionRate =
    stats?.conversionRate ??
    (stats?.totalProspects ? (stats.convertedProspects / stats.totalProspects) * 100 : 0);

  const avgCycleDays = useMemo(() => {
    const durations = filteredQuotes
      .map((quote: any) => {
        const start = new Date(quote.sentAt || quote.createdAt || quote.dateDevis || Date.now());
        const end = new Date(
          quote.clientRespondedAt || quote.acceptedAt || quote.refusedAt || quote.updatedAt || Date.now()
        );
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
        return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter((value: number | null): value is number => value !== null);

    if (durations.length === 0) return 0;
    return durations.reduce((sum, value) => sum + value, 0) / durations.length;
  }, [filteredQuotes]);

  const recentProspects = useMemo(() => filteredProspects.slice(0, 5), [filteredProspects]);
  const recentQuotes = useMemo(() => filteredQuotes.slice(0, 5), [filteredQuotes]);

  const serviceOptions = useMemo(() => {
    const services = new Set<string>();
    quotes.forEach((quote: any) => {
      if (quote.serviceName) services.add(quote.serviceName);
    });
    return Array.from(services).sort();
  }, [quotes]);

  const commercialOptions = useMemo(() => {
    const commercials = new Set<string>();
    quotes.forEach((quote: any) => {
      const label =
        quote.commercialName || quote.commercial?.name || quote.createdByEmail || quote.createdById;
      if (label) commercials.add(label);
    });
    return Array.from(commercials).sort();
  }, [quotes]);

  const pipelineChartData = useMemo(() => {
    const stageMap = filteredProspects.reduce<Record<string, number>>((acc, prospect: any) => {
      const key = prospect.stage || 'preparation';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(stageMap).map(([stage, value]) => ({
      name: STAGE_LABELS[stage] || stage,
      value,
    }));
  }, [filteredProspects]);

  const statusChartData = useMemo(() => {
    const statusMap = filteredQuotes.reduce<Record<string, number>>((acc, quote: any) => {
      const key = quote.status || 'BROUILLON';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusMap).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      status,
      value,
    }));
  }, [filteredQuotes]);

  const serviceChartData = useMemo(() => {
    const serviceMap = filteredQuotes.reduce<Record<string, { count: number; amount: number }>>(
      (acc, quote: any) => {
        const key =
          quote.commercialName ||
          quote.commercial?.name ||
          quote.createdByEmail ||
          quote.createdById ||
          quote.serviceName ||
          'Non attribué';
        if (!acc[key]) acc[key] = { count: 0, amount: 0 };
        acc[key].count += 1;
        acc[key].amount += Number(quote.montantTTC || 0);
        return acc;
      },
      {}
    );
    return Object.entries(serviceMap)
      .map(([service, data]) => ({
        service,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredQuotes]);

  const trendChartData = useMemo(() => {
    const byKey = filteredQuotes.reduce<Record<string, { amount: number; count: number }>>(
      (acc, quote: any) => {
        const date = quote.effectiveDate as Date;
        if (Number.isNaN(date.getTime())) return acc;
        let key = '';
        if (period === '12m' || period === 'annee') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          key = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        }
        if (!acc[key]) acc[key] = { amount: 0, count: 0 };
        acc[key].amount += Number(quote.montantTTC || 0);
        acc[key].count += 1;
        return acc;
      },
      {}
    );

    return Object.entries(byKey)
      .map(([label, data]) => ({ label, amount: data.amount, count: data.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredQuotes, period]);

  const commercialKpiRows = useMemo(() => {
    const rows = filteredQuotes.reduce<
      Record<string, { count: number; amount: number; won: number; lost: number; responseDays: number[] }>
    >((acc, quote: any) => {
      const key =
        quote.commercialName ||
        quote.commercial?.name ||
        quote.createdByEmail ||
        quote.createdById ||
        'Non attribué';
      if (!acc[key]) acc[key] = { count: 0, amount: 0, won: 0, lost: 0, responseDays: [] };
      acc[key].count += 1;
      acc[key].amount += Number(quote.montantTTC || 0);
      if (quote.status === 'ACCEPTE' || quote.status === 'FACTURE' || quote.status === 'TRANSMIS_FACTURATION') {
        acc[key].won += 1;
      }
      if (quote.status === 'REFUSE') {
        acc[key].lost += 1;
      }
      const start = new Date(quote.sentAt || quote.createdAt || quote.dateDevis || Date.now());
      const end = new Date(
        quote.clientRespondedAt || quote.acceptedAt || quote.refusedAt || quote.updatedAt || Date.now()
      );
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        acc[key].responseDays.push(Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
      return acc;
    }, {});

    return Object.entries(rows)
      .map(([name, data]) => {
        const winRate = data.won + data.lost > 0 ? (data.won / (data.won + data.lost)) * 100 : 0;
        const avgDelay =
          data.responseDays.length > 0
            ? data.responseDays.reduce((sum, value) => sum + value, 0) / data.responseDays.length
            : 0;
        return {
          name,
          count: data.count,
          amount: data.amount,
          winRate,
          avgDelay,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredQuotes]);

  const formatCurrency = (amount: number) =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

  if (prospectsLoading || quotesLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Commercial</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vue d&apos;ensemble des opportunités, devis et performances commerciales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/commercial/quotes">Voir les devis</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/commercial/prospects">Prospection</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filtres d&apos;analyse
            </CardTitle>
            <p className="text-xs text-muted-foreground">Ajustez la période et le service pour affiner les KPI.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Période</span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as PeriodFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Service</span>
            <select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Tous les services</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Commercial</span>
            <select
              value={commercialFilter}
              onChange={(event) => setCommercialFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Tous les commerciaux</option>
              {commercialOptions.map((commercial) => (
                <option key={commercial} value={commercial}>
                  {commercial}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
    </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prospects actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProspects ?? prospects.length}</div>
            <p className="text-xs text-muted-foreground">Pipeline en cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Devis en cours</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQuotes.length}</div>
            <p className="text-xs text-muted-foreground">En attente client / modification</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Devis acceptés</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedQuotes.length}</div>
            <p className="text-xs text-muted-foreground">Validés ou facturés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Montant devis</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalQuoteValue)}</div>
            <p className="text-xs text-muted-foreground">Total TTC cumulé</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Prospects convertis en clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win rate devis</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Acceptés vs refusés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Délai moyen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCycleDays.toFixed(1)} j</div>
            <p className="text-xs text-muted-foreground">Entre envoi et retour client</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CA par commercial</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceChartData.length}</div>
            <p className="text-xs text-muted-foreground">Collaborateurs actifs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              Pipeline prospects
            </CardTitle>
            <p className="text-xs text-muted-foreground">Répartition des prospects sur le pipeline commercial.</p>
          </CardHeader>
          <CardContent className="h-[260px]">
            {pipelineChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune donnée sur la période sélectionnée.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData} margin={{ left: 4, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: any) => [value, 'Prospects']} />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Statuts des devis
            </CardTitle>
            <p className="text-xs text-muted-foreground">Suivi des devis par statut métier.</p>
          </CardHeader>
          <CardContent className="h-[260px]">
            {statusChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucun devis sur la période sélectionnée.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {statusChartData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, _name, props: any) => [value, props?.payload?.name || '']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tendance des devis
            </CardTitle>
            <p className="text-xs text-muted-foreground">Montants TTC et volumes de devis sur la période sélectionnée.</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            {trendChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Pas de devis disponibles.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ left: 4, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    formatter={(value: any, name) =>
                      name === 'amount'
                        ? [formatCurrency(Number(value)), 'Montant TTC']
                        : [value, 'Devis']
                    }
                  />
                  <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              CA par commercial
            </CardTitle>
            <p className="text-xs text-muted-foreground">Montants cumulés par commercial/service.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {commercialKpiRows.length === 0 && (
              <div className="text-sm text-muted-foreground">Aucun devis disponible.</div>
            )}
            {commercialKpiRows.map((row, index) => (
              <div key={row.name} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {row.name}
                      {index === 0 && <Badge>Top</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.count} devis · Win {row.winRate.toFixed(1)}% · Délai {row.avgDelay.toFixed(1)} j
                    </div>
                  </div>
                  <Badge variant="outline">{formatCurrency(row.amount)}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Prospects récents</CardTitle>
              <p className="text-xs text-muted-foreground">Dernières opportunités créées</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/commercial/prospects" className="inline-flex items-center gap-1">
                Tout voir <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProspects.length === 0 && (
              <div className="text-sm text-muted-foreground">Aucun prospect disponible.</div>
            )}
            {recentProspects.map((prospect: any) => (
              <div key={prospect.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-semibold">{prospect.companyName || prospect.contactName}</div>
                  <div className="text-xs text-muted-foreground">{prospect.email || prospect.phone || '-'}</div>
                </div>
                <Badge variant="outline">{prospect.stage || 'preparation'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Devis récents</CardTitle>
              <p className="text-xs text-muted-foreground">Dernières propositions envoyées</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/commercial/quotes" className="inline-flex items-center gap-1">
                Tout voir <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentQuotes.length === 0 && (
              <div className="text-sm text-muted-foreground">Aucun devis disponible.</div>
            )}
            {recentQuotes.map((quote: any) => (
              <div key={quote.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-semibold">{quote.numeroDevis}</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(quote.montantTTC || 0)}</div>
                </div>
                <Badge variant="outline">{quote.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
