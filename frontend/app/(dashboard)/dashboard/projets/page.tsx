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
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FolderKanban,
  TimerReset,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { projectsService } from '@/shared/api/projects';
import { jalonsService, type Jalon } from '@/shared/api/projects/jalons.service';
import { apiClient } from '@/shared/api/shared/client';
import { ProjectStatus, type Project } from '@/shared/api/types';
import type { Task, TimeEntry } from '@/shared/api/projects/types';
import { STATUS_LABELS, STATUS_COLORS, TASK_LABELS, formatCurrency, formatDate, isOverdue, useProjectsDashboardPageModel } from './page.model';

export default function ProjectsDashboardPage() {  const { period, setPeriod, managerFilter, setManagerFilter, projectsResponse, loadingProjects, statsResponse, loadingStats, tasksResponse, loadingTasks, jalonsResponse, loadingJalons, timesheets, loadingTimesheets, isLoading, projects, tasks, milestones, projectStats, periodStart, managerOptions, filteredProjects, filteredProjectIds, filteredTasks, filteredMilestones, filteredTimesheets, kpis, statusChartData, tasksChartData, workloadChartData, upcomingMilestones, portfolioRows, quickModules } = useProjectsDashboardPageModel();



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
          <h1 className="text-3xl font-bold">Dashboard Projets</h1>
          <p className="mt-2 text-muted-foreground">
            Pilotage temps réel du portefeuille projets, de la planification, des jalons
            et des feuilles de temps.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="7j">7 jours</option>
            <option value="30j">30 jours</option>
            <option value="90j">90 jours</option>
            <option value="12m">12 mois</option>
          </select>
          <select
            value={managerFilter}
            onChange={(event) => setManagerFilter(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Tous les managers</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.label}
              </option>
            ))}
          </select>
          <Button asChild>
            <Link href="/dashboard/projets/liste">Créer un projet</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/projets/taches">Ouvrir les tâches</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/projets/planning">Ouvrir le planning Gantt</Link>
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

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Répartition du portefeuille</h2>
            <p className="text-sm text-muted-foreground">
              Répartition des projets par statut pour suivre le pipeline de livraison.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
              >
                {statusChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} projet(s)`, 'Volume']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid gap-3 md:grid-cols-2">
            {statusChartData.map((item) => (
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
            <h2 className="text-xl font-semibold">Tâches & planning</h2>
            <p className="text-sm text-muted-foreground">
              Lecture rapide du flux des tâches, des blocages et du travail en revue.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={tasksChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: number) => [`${value} tâche(s)`, 'Volume']} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Charge projet / feuilles de temps</h2>
            <p className="text-sm text-muted-foreground">
              Heures déclarées par projet pour arbitrer la charge et la productivité.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={workloadChartData} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip formatter={(value: number) => [`${value} h`, 'Temps saisi']} />
              <Bar dataKey="hours" radius={[0, 8, 8, 0]} fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Jalons à surveiller</h2>
            <p className="text-sm text-muted-foreground">
              Prochaines échéances projet pour éviter les dérives de planning.
            </p>
          </div>
          <div className="space-y-3">
            {upcomingMilestones.length ? (
              upcomingMilestones.map((milestone: Jalon) => {
                const project = projects.find((item) => item.id === milestone.projetId);
                const overdue = isOverdue(milestone.dateEcheance);
                return (
                  <div key={milestone.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{milestone.nom}</p>
                        <p className="text-sm text-muted-foreground">{project?.name || 'Projet non lié'}</p>
                      </div>
                      <Badge variant={overdue ? 'destructive' : 'secondary'}>
                        {overdue ? 'En retard' : milestone.status === 'PLANIFIE' ? 'Planifié' : milestone.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>Échéance {formatDate(milestone.dateEcheance)}</span>
                      <span>{milestone.livrables?.length || 0} livrable(s)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Aucun jalon à surveiller pour le moment.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {quickModules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.title} className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                Module Projets
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

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Portefeuille récent</h2>
            <p className="text-sm text-muted-foreground">
              Vue synthétique des projets les plus récemment mis à jour.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/projets/taches">
              <TimerReset className="mr-2 h-4 w-4" />
              Suivre les tâches
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Projet</th>
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Manager</th>
                <th className="py-3 pr-4">Budget</th>
                <th className="py-3 pr-4">Avancement</th>
                <th className="py-3 pr-4">Statut</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {portfolioRows.map((project: Project) => (
                <tr key={project.id} className="border-b last:border-b-0">
                  <td className="py-4 pr-4">
                    <div className="font-semibold">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{project.projectNumber || project.id.slice(0, 8)}</div>
                  </td>
                  <td className="py-4 pr-4 text-muted-foreground">
                    {project.clientName || project.customer?.companyName || project.customerId || '-'}
                  </td>
                  <td className="py-4 pr-4 text-muted-foreground">
                    {project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : project.managerId || '-'}
                  </td>
                  <td className="py-4 pr-4">{formatCurrency(Number(project.budget || 0))}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${Math.max(0, Math.min(100, Number(project.completion || 0)))}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{Number(project.completion || 0)}%</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <Badge variant="secondary" className="border-0">
                      {STATUS_LABELS[project.status]}
                    </Badge>
                  </td>
                  <td className="py-4 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/projets/${project.id}`}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Voir
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!portfolioRows.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Aucun projet disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
