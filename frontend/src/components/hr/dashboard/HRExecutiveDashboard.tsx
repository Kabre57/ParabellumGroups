'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import { Activity, Banknote, Briefcase, FileCheck2, ShieldCheck, Users } from 'lucide-react';
import { hrService } from '@/shared/api/hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatShortCurrency = (value: number) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} k`;
  return `${amount}`;
};

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const chartTooltipStyle = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))',
};

export function HRExecutiveDashboard() {
  const router = useRouter();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['rh-dashboard-overview', month, year],
    queryFn: () => hrService.getPayrollOverview({ month, year }),
  });

  const { data: employeesResponse, isLoading: employeesLoading } = useQuery({
    queryKey: ['rh-dashboard-employees'],
    queryFn: () => hrService.getEmployees({ page: 1, pageSize: 200 }),
  });

  const { data: leavesResponse, isLoading: leavesLoading } = useQuery({
    queryKey: ['rh-dashboard-leaves'],
    queryFn: () => hrService.getConges({ page: 1, limit: 200 }),
  });

  const { data: loansResponse, isLoading: loansLoading } = useQuery({
    queryKey: ['rh-dashboard-loans'],
    queryFn: () => hrService.list({ page: 1, limit: 200 }),
  });

  const { data: evaluationsResponse, isLoading: evaluationsLoading } = useQuery({
    queryKey: ['rh-dashboard-evaluations'],
    queryFn: () => hrService.getEvaluations({ limit: 200 }),
  });

  const { data: payrollsResponse, isLoading: payrollsLoading } = useQuery({
    queryKey: ['rh-dashboard-payrolls', month, year],
    queryFn: () => hrService.getPayrolls({ month, year, pageSize: 200 }),
  });

  const isLoading =
    overviewLoading ||
    employeesLoading ||
    leavesLoading ||
    loansLoading ||
    evaluationsLoading ||
    payrollsLoading;

  const employees = employeesResponse?.data ?? [];
  const leaves = leavesResponse?.data ?? [];
  const loans = loansResponse?.data ?? [];
  const evaluations = evaluationsResponse?.data ?? [];
  const payrolls = payrollsResponse?.data ?? [];

  const kpis = useMemo(() => {
    const activeEmployees = employees.filter((employee) => employee.isActive).length;
    const pendingLeaves = leaves.filter((leave) => leave.statut === 'EN_ATTENTE').length;
    const activeLoans = loans.filter((loan) => !['TERMINE', 'ANNULE'].includes(String(loan.statut || '').toUpperCase())).length;
    const evaluationScores = evaluations
      .map((evaluation: any) => Number(evaluation.noteGlobale || 0))
      .filter((score) => Number.isFinite(score) && score > 0);

    return {
      activeEmployees,
      netPayroll: overview?.payroll?.totalNet || 0,
      employerCost: overview?.payroll?.totalEmployerCost || 0,
      paidPayrolls: overview?.payroll?.paidCount || 0,
      totalPayrolls: overview?.payroll?.bulletinsCount || payrolls.length,
      pendingLeaves,
      activeLoans,
      avgEvaluation: average(evaluationScores),
    };
  }, [employees, evaluations, leaves, loans, overview, payrolls.length]);

  const departmentChartData = useMemo(() => {
    const grouped = employees.reduce<Record<string, number>>((accumulator, employee) => {
      const department = employee.department || 'Non renseigné';
      accumulator[department] = (accumulator[department] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);
  }, [employees]);

  const leaveStatusData = useMemo(() => {
    const grouped = leaves.reduce<Record<string, number>>((accumulator, leave) => {
      const status = leave.statut || 'EN_ATTENTE';
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      APPROUVE: 'Approuvés',
      REFUSE: 'Refusés',
      ANNULE: 'Annulés',
    };

    return Object.entries(grouped).map(([status, value]) => ({
      name: labels[status] || status,
      value,
    }));
  }, [leaves]);

  const payrollStatusData = useMemo(() => {
    const grouped = payrolls.reduce<Record<string, number>>((accumulator, payroll) => {
      const status = String(payroll.status || 'genere').toLowerCase();
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    const labels: Record<string, string> = {
      genere: 'Générés',
      brouillon: 'Brouillons',
      valide: 'Validés',
      paye: 'Payés',
      paid: 'Payés',
      validated: 'Validés',
      draft: 'Brouillons',
    };

    return Object.entries(grouped).map(([status, value]) => ({
      name: labels[status] || status,
      value,
    }));
  }, [payrolls]);

  const performanceChartData = useMemo(() => {
    const grouped = evaluations.reduce<Record<string, { total: number; count: number }>>((accumulator, evaluation: any) => {
      const department = evaluation.employe?.departement || 'Non renseigné';
      const score = Number(evaluation.noteGlobale || 0);
      if (!Number.isFinite(score) || score <= 0) {
        return accumulator;
      }
      accumulator[department] = accumulator[department] || { total: 0, count: 0 };
      accumulator[department].total += score;
      accumulator[department].count += 1;
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .map(([name, bucket]) => ({
        name,
        value: Number((bucket.total / Math.max(1, bucket.count)).toFixed(2)),
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);
  }, [evaluations]);

  const complianceHighlights = overview?.compliance ?? [];
  const coverageRate = overview?.workforce?.activeEmployees
    ? Math.round(((overview.workforce.coveredEmployees || 0) / overview.workforce.activeEmployees) * 100)
    : 0;

  if (isLoading || !overview) {
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
          <h1 className="text-3xl font-bold">Ressources Humaines</h1>
          <p className="mt-2 text-muted-foreground">
            Cockpit RH et paie en temps réel pour suivre les effectifs, la masse salariale,
            la conformité légale et la performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/rh/employes')}>
            Voir les employés
          </Button>
          <Button onClick={() => router.push('/dashboard/rh/paie')}>Ouvrir le module Paie</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Effectif actif</p>
              <p className="mt-2 text-3xl font-bold">{kpis.activeEmployees}</p>
              <p className="mt-1 text-xs text-muted-foreground">{overview.workforce.totalEmployees} salariés suivis</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Masse salariale nette</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(kpis.netPayroll)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{overview.period.label}</p>
            </div>
            <Banknote className="h-8 w-8 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Coût employeur</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(kpis.employerCost)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Brut + charges patronales</p>
            </div>
            <Briefcase className="h-8 w-8 text-violet-600" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bulletins traités</p>
              <p className="mt-2 text-3xl font-bold">
                {kpis.paidPayrolls}/{Math.max(1, kpis.totalPayrolls)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{overview.payroll.validatedCount} validés</p>
            </div>
            <FileCheck2 className="h-8 w-8 text-amber-600" />
          </div>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <Card className="p-4 xl:col-span-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Périmètre PBL : {overview.workforce.supportedInitialRange}</Badge>
            <Badge variant="outline">Capacité {overview.workforce.supportedScale} salariés</Badge>
            <Badge className={coverageRate >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
              Couverture dossiers : {coverageRate}%
            </Badge>
            <Badge className={overview.workforce.missingCnpsCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
              CNPS manquants : {overview.workforce.missingCnpsCount}
            </Badge>
            <Badge className={overview.workforce.missingCnamCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
              CMU/CNAM manquants : {overview.workforce.missingCnamCount}
            </Badge>
            <Badge variant="outline">Congés en attente : {kpis.pendingLeaves}</Badge>
            <Badge variant="outline">Prêts & avances actifs : {kpis.activeLoans}</Badge>
            <Badge variant="outline">Note moyenne performance : {kpis.avgEvaluation.toFixed(1)}/5</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Conformité paie</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {complianceHighlights.filter((metric) => metric.status === 'ok').length}/{complianceHighlights.length}
              </div>
              <div className="text-xs text-muted-foreground">indicateurs conformes</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Effectif par département</h2>
            <p className="text-sm text-muted-foreground">
              Répartition actuelle des salariés suivis dans les services.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={departmentChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => [`${value} salarié(s)`, 'Effectif']} contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {departmentChartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Congés par statut</h2>
            <p className="text-sm text-muted-foreground">
              Visualisez l’état du circuit d’approbation des congés.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={leaveStatusData}
                dataKey="value"
                nameKey="name"
                innerRadius={68}
                outerRadius={110}
                paddingAngle={2}
              >
                {leaveStatusData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} demande(s)`, 'Volume']} contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Bulletins de la période</h2>
            <p className="text-sm text-muted-foreground">
              Statut opérationnel de la paie sur {overview.period.label}.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={payrollStatusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={90} />
              <Tooltip formatter={(value: number) => [`${value} bulletin(s)`, 'Volume']} contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {payrollStatusData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Performance moyenne</h2>
            <p className="text-sm text-muted-foreground">
              Notes globales moyennes par département.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={performanceChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 5]} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => [`${value}/5`, 'Score']} contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {performanceChartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Synthèse conformité CI</h2>
            <p className="text-sm text-muted-foreground">
              Controle paie ivoirienne, obligations sociales et exports.
            </p>
          </div>
          <div className="space-y-3">
            {complianceHighlights.slice(0, 5).map((metric) => (
              <div key={metric.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{metric.label}</div>
                  <Badge
                    className={
                      metric.status === 'ok'
                        ? 'bg-emerald-100 text-emerald-800'
                        : metric.status === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {metric.value}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{metric.description}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Indicateurs RH en direct</h2>
            <p className="text-sm text-muted-foreground">
              Vue de gestion rapide des éléments à surveiller dans le mois courant.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Congés en attente</div>
              <div className="mt-2 text-2xl font-semibold">{kpis.pendingLeaves}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Prêts / avances actifs</div>
              <div className="mt-2 text-2xl font-semibold">{kpis.activeLoans}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Impôts & cotisations</div>
              <div className="mt-2 text-2xl font-semibold">{formatShortCurrency(overview.payroll.totalTaxes + overview.payroll.totalEmployeeContributions)}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">CNPS / CMU couverts</div>
              <div className="mt-2 text-2xl font-semibold">{overview.workforce.coveredEmployees}</div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Actions rapides</h2>
            <p className="text-sm text-muted-foreground">Accès direct aux écrans RH clés.</p>
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/rh/employes/new')}>
              Nouvel employé
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/rh/paie')}>
              Bulletins & exports
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/rh/conges')}>
              Gestion des congés
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/rh/evaluations')}>
              Évaluations de performance
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/rh/prets')}>
              Prêts & avances
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default HRExecutiveDashboard;
