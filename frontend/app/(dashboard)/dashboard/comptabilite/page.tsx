'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Landmark,
  Receipt,
  Scale,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import billingService from '@/shared/api/billing';

const PAYMENT_METHOD_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2'];

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

type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Année' },
  { value: 'all', label: 'Tout' },
];

export default function AccountingDashboardPage() {
  const [period, setPeriod] = useState<Period>('month');

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-dashboard', period],
    queryFn: () => billingService.getAccountingOverview(period),
  });

  const overview = data?.data;
  const summary = overview?.summary;
  const reports = overview?.reports;
  const movements = overview?.treasuryMovements ?? [];
  const entries = overview?.entries ?? [];

  const kpis = useMemo(
    () => [
      {
        label: 'Produits comptabilisés',
        value: formatCurrency(summary?.totalRevenue || 0),
        helper: `${formatCurrency(summary?.totalReceived || 0)} encaissés`,
      },
      {
        label: 'Charges comptabilisées',
        value: formatCurrency(summary?.totalExpenseHT || 0),
        helper: `${formatCurrency(summary?.totalDisbursed || 0)} décaissés`,
      },
      {
        label: 'Créances clients',
        value: formatCurrency(summary?.clientReceivables || 0),
        helper: 'Montants restant à encaisser',
      },
      {
        label: 'Résultat net',
        value: formatCurrency(summary?.netResult || 0),
        helper: `${formatCurrency(summary?.pendingCommitted || 0)} engagements non soldés`,
      },
    ],
    [summary]
  );

  const treasuryBars = useMemo(
    () => [
      { name: 'Encaissements', amount: reports?.treasury?.inflows || 0, color: '#16a34a' },
      { name: 'Décaissements', amount: reports?.treasury?.outflows || 0, color: '#dc2626' },
      { name: 'Solde clôture', amount: reports?.treasury?.closingBalance || 0, color: '#2563eb' },
    ],
    [reports]
  );

  const paymentMethodData = useMemo(
    () =>
      Object.entries(reports?.treasury?.byPaymentMethod || {})
        .map(([name, value]) => ({ name, value: Number(value || 0) }))
        .filter((item) => item.value > 0),
    [reports]
  );

  const balanceSheetData = useMemo(
    () => [
      { name: 'Actif', value: reports?.balanceSheet?.totalAssets || 0 },
      { name: 'Passif', value: reports?.balanceSheet?.totalLiabilities || 0 },
      { name: 'Capitaux propres', value: reports?.balanceSheet?.totalEquity || 0 },
    ],
    [reports]
  );

  const latestMovements = useMemo(() => movements.slice(0, 6), [movements]);
  const latestEntries = useMemo(() => entries.slice(0, 6), [entries]);

  const actionCards = [
    {
      title: 'Bons de caisse',
      description: 'Pilotage des demandes de décaissement, validations et sorties de caisse.',
      href: '/dashboard/comptabilite/depenses',
      icon: Wallet,
    },
    {
      title: 'Trésorerie',
      description: 'Lecture détaillée des encaissements, décaissements et modes de paiement.',
      href: '/dashboard/comptabilite/tresorerie',
      icon: Landmark,
    },
    {
      title: 'Écritures',
      description: 'Journaux, mouvements comptables et équilibrage des écritures.',
      href: '/dashboard/comptabilite/ecritures',
      icon: Receipt,
    },
    {
      title: 'Comptes',
      description: 'Plan comptable, soldes et variations des comptes.',
      href: '/dashboard/comptabilite/comptes',
      icon: BookOpen,
    },
    {
      title: 'Balance',
      description: 'Débits, crédits et soldes par compte, avec filtre mère et filiales.',
      href: '/dashboard/comptabilite/balance',
      icon: Scale,
    },
  ];

  if (isLoading || !overview || !summary || !reports) {
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
          <h1 className="text-3xl font-bold">Dashboard Comptable</h1>
          <p className="mt-2 text-muted-foreground">
            Vue de pilotage de la performance comptable, de la trésorerie,
            des engagements et des écritures de l&apos;entreprise.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button variant="outline" asChild>
            <Link href="/dashboard/comptabilite/rapports">Voir les rapports</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/comptabilite/ecritures">Ouvrir les écritures</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold">{kpi.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{kpi.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Flux de trésorerie</h2>
            <p className="text-sm text-muted-foreground">
              Encaissements, décaissements et solde de clôture sur la période choisie.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={treasuryBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {treasuryBars.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Structure du bilan</h2>
            <p className="text-sm text-muted-foreground">
              Répartition simplifiée entre actif, passif et capitaux propres.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={balanceSheetData}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={4}
              >
                {balanceSheetData.map((entry, index) => (
                  <Cell key={entry.name} fill={PAYMENT_METHOD_COLORS[index % PAYMENT_METHOD_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid gap-3">
            {balanceSheetData.map((item, index) => (
              <div key={item.name} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PAYMENT_METHOD_COLORS[index % PAYMENT_METHOD_COLORS.length] }}
                  />
                  {item.name}
                </div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(item.value)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Modes de règlement</h2>
            <p className="text-sm text-muted-foreground">
              Répartition des flux par moyen de paiement sur la période courante.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={paymentMethodData} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Lecture métier</h2>
            <p className="text-sm text-muted-foreground">
              Lecture instantanée de la position comptable de l&apos;entreprise.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                Encaissements
              </div>
              <div className="mt-2 text-2xl font-semibold text-green-700">
                {formatCurrency(reports.treasury.inflows)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                Décaissements
              </div>
              <div className="mt-2 text-2xl font-semibold text-red-700">
                {formatCurrency(reports.treasury.outflows)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Engagements totaux</p>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalCommitted)}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                Dont {formatCurrency(summary.pendingCommitted)} encore à solder.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actionCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                Module Comptable
              </div>
              <h3 className="mt-3 text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <Link href={card.href}>Ouvrir</Link>
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Derniers mouvements de trésorerie</h2>
              <p className="text-sm text-muted-foreground">Suivi récent des encaissements et décaissements.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/comptabilite/tresorerie">Voir tout</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {latestMovements.length ? (
              latestMovements.map((movement) => (
                <div key={movement.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{movement.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {movement.category} · {formatDate(movement.date)}
                      </p>
                    </div>
                    <div className={`text-right text-sm font-semibold ${movement.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                      {movement.type === 'income' ? '+' : '-'}{formatCompactCurrency(movement.amount)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Solde après mouvement : {formatCurrency(movement.balance)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Aucun mouvement sur cette période.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Dernières écritures</h2>
              <p className="text-sm text-muted-foreground">Écritures comptables récentes et journaux concernés.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/comptabilite/ecritures">Voir tout</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {latestEntries.length ? (
              latestEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{entry.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.journalLabel} · {formatDate(entry.date)} · {entry.reference || 'Sans référence'}
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      {formatCompactCurrency(Math.max(entry.debit || 0, entry.credit || 0))}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Débit {entry.accountDebit} · Crédit {entry.accountCredit}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Aucune écriture disponible.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
