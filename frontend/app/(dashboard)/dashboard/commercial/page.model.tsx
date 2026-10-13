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

// État, chargement et actions du parcours d'interface.


export type PeriodFilter = '7j' | '30j' | '90j' | '12m' | 'annee';


export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '7j': '7 jours',
  '30j': '30 jours',
  '90j': '90 jours',
  '12m': '12 mois',
  annee: 'Année en cours',
};



export const STAGE_LABELS: Record<string, string> = {
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



export const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  MODIFICATION_DEMANDEE: 'Modif. demandée',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  EXPIRE: 'Expiré',
  TRANSMIS_FACTURATION: 'Transmis',
  FACTURE: 'Facturé',
};



export const STATUS_COLORS: Record<string, string> = {
  BROUILLON: '#94a3b8',
  ENVOYE: '#2563eb',
  MODIFICATION_DEMANDEE: '#f97316',
  ACCEPTE: '#16a34a',
  REFUSE: '#dc2626',
  EXPIRE: '#e11d48',
  TRANSMIS_FACTURATION: '#0ea5e9',
  FACTURE: '#7c3aed',
};

export function useCommercialDashboardPageModel() {

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
  return {
    period,
    setPeriod,
    serviceFilter,
    setServiceFilter,
    commercialFilter,
    setCommercialFilter,
    prospects,
    prospectsLoading,
    stats,
    quotesResponse,
    quotesLoading,
    quotes,
    filterStartDate,
    normalizedQuotes,
    filteredQuotes,
    filteredProspects,
    totalQuoteValue,
    pendingQuotes,
    acceptedQuotes,
    refusedQuotes,
    winRate,
    conversionRate,
    avgCycleDays,
    recentProspects,
    recentQuotes,
    serviceOptions,
    commercialOptions,
    pipelineChartData,
    statusChartData,
    serviceChartData,
    trendChartData,
    commercialKpiRows,
    formatCurrency,
  };
}
