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

// État, chargement et actions du parcours d'interface.


export const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planifié',
  ACTIVE: 'En cours',
  ON_HOLD: 'Suspendu',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};



export const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: '#94a3b8',
  ACTIVE: '#2563eb',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
};



export const TASK_LABELS: Record<Task['status'], string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  IN_REVIEW: 'En revue',
  DONE: 'Terminées',
  BLOCKED: 'Bloquées',
};



export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');



export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-FR');
};



export const isOverdue = (date?: string | null) => {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
};

export function useProjectsDashboardPageModel() {

  const [period, setPeriod] = useState<'7j' | '30j' | '90j' | '12m'>('30j');
  const [managerFilter, setManagerFilter] = useState('');

  const { data: projectsResponse, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-dashboard-list'],
    queryFn: () => projectsService.getProjects({ limit: 200, sortBy: 'updatedAt', sortOrder: 'desc' }),
  });

  const { data: statsResponse, isLoading: loadingStats } = useQuery({
    queryKey: ['projects-dashboard-stats'],
    queryFn: () => projectsService.getGlobalStats(),
  });

  const { data: tasksResponse, isLoading: loadingTasks } = useQuery({
    queryKey: ['projects-dashboard-tasks'],
    queryFn: () => projectsService.getTasks({ limit: 300, sortBy: 'updatedAt', sortOrder: 'desc' }),
  });

  const { data: jalonsResponse, isLoading: loadingJalons } = useQuery({
    queryKey: ['projects-dashboard-jalons'],
    queryFn: () => jalonsService.getJalons({ limit: 200, sortBy: 'dateEcheance', sortOrder: 'asc' }),
  });

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery<TimeEntry[]>({
    queryKey: ['projects-dashboard-timesheets'],
    queryFn: async () => {
      const response = await apiClient.get('/timesheets');
      return response.data?.data || response.data || [];
    },
  });

  const isLoading = loadingProjects || loadingStats || loadingTasks || loadingJalons || loadingTimesheets;
  const projects = projectsResponse?.data ?? [];
  const tasks = tasksResponse?.data ?? [];
  const milestones = jalonsResponse?.data ?? [];
  const projectStats = statsResponse?.data;

  const periodStart = useMemo(() => {
    const now = new Date();
    const days = period === '7j' ? 7 : period === '30j' ? 30 : period === '90j' ? 90 : 365;
    const copy = new Date(now);
    copy.setDate(copy.getDate() - (days - 1));
    return new Date(copy.getFullYear(), copy.getMonth(), copy.getDate());
  }, [period]);

  const managerOptions = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      const id = project.manager?.id || project.managerId;
      const label =
        project.manager
          ? `${project.manager.firstName || ''} ${project.manager.lastName || ''}`.trim()
          : project.managerId || '';
      if (id && label) {
        map.set(id, label);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const managerId = project.manager?.id || project.managerId || '';
      const managerName = project.manager
        ? `${project.manager.firstName || ''} ${project.manager.lastName || ''}`.trim()
        : '';
      const matchesManager =
        !managerFilter || managerFilter === managerId || managerFilter === managerName;
      const projectDate = project.updatedAt || project.createdAt || project.startDate;
      if (!projectDate) return matchesManager;
      const parsed = new Date(projectDate);
      if (Number.isNaN(parsed.getTime())) return matchesManager;
      return matchesManager && parsed >= periodStart;
    });
  }, [projects, managerFilter, periodStart]);

  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map((project) => project.id)),
    [filteredProjects],
  );

  const filteredTasks = useMemo(
    () => tasks.filter((task) => !task.projectId || filteredProjectIds.has(task.projectId)),
    [tasks, filteredProjectIds],
  );

  const filteredMilestones = useMemo(
    () => milestones.filter((milestone) => !milestone.projetId || filteredProjectIds.has(milestone.projetId)),
    [milestones, filteredProjectIds],
  );

  const filteredTimesheets = useMemo(
    () => timesheets.filter((entry) => !entry.projectId || filteredProjectIds.has(entry.projectId)),
    [timesheets, filteredProjectIds],
  );

  const kpis = useMemo(() => {
    const activeProjects = filteredProjects.filter((project) => project.status === ProjectStatus.ACTIVE).length;
    const onHoldProjects = filteredProjects.filter((project) => project.status === ProjectStatus.ON_HOLD).length;
    const completedProjects = filteredProjects.filter((project) => project.status === ProjectStatus.COMPLETED).length;
    const overdueTasks = filteredTasks.filter((task) => task.status !== 'DONE' && isOverdue(task.dueDate)).length;
    const totalTrackedHours = filteredTimesheets.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const approvedHours = filteredTimesheets
      .filter((entry) => entry.isApproved)
      .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);

    return [
      {
        label: 'Portefeuille projets',
        value: String(filteredProjects.length),
        helper: `${activeProjects} actifs / ${completedProjects} terminés`,
      },
      {
        label: 'Budget portefeuille',
        value: formatCurrency(filteredProjects.reduce((sum, project) => sum + Number(project.budget || 0), 0)),
        helper: `${formatCurrency(filteredProjects.reduce((sum, project) => sum + Number(project.spent || 0), 0))} consommés`,
      },
      {
        label: 'Tâches & planning',
        value: String(filteredTasks.length),
        helper: `${overdueTasks} échéances dépassées / ${onHoldProjects} projets suspendus`,
      },
      {
        label: 'Feuilles de temps',
        value: `${totalTrackedHours.toFixed(1)} h`,
        helper: `${approvedHours.toFixed(1)} h validées`,
      },
    ];
  }, [filteredProjects, filteredTasks, filteredTimesheets]);

  const statusChartData = useMemo(
    () =>
      (Object.keys(STATUS_LABELS) as ProjectStatus[])
        .map((status) => ({
          name: STATUS_LABELS[status],
          value: filteredProjects.filter((project) => project.status === status).length,
          color: STATUS_COLORS[status],
        }))
        .filter((item) => item.value > 0),
    [filteredProjects]
  );

  const tasksChartData = useMemo(
    () =>
      (Object.keys(TASK_LABELS) as Task['status'][])
        .map((status) => ({
          name: TASK_LABELS[status],
          value: filteredTasks.filter((task) => task.status === status).length,
        }))
        .filter((item) => item.value > 0),
    [filteredTasks]
  );

  const workloadChartData = useMemo(() => {
    const byProject = filteredTimesheets.reduce<Record<string, number>>((accumulator, entry) => {
      const key = entry.projectId || 'Autres';
      accumulator[key] = (accumulator[key] || 0) + Number(entry.hours || 0);
      return accumulator;
    }, {});

    return Object.entries(byProject)
      .map(([projectId, hours]) => ({
        name:
          filteredProjects.find((project) => project.id === projectId)?.name ||
          projectId ||
          'Autres',
        hours: Number(hours.toFixed(1)),
      }))
      .sort((left, right) => right.hours - left.hours)
      .slice(0, 6);
  }, [filteredProjects, filteredTimesheets]);

  const upcomingMilestones = useMemo(
    () =>
      [...filteredMilestones]
        .filter((milestone) => milestone.status !== 'ATTEINT')
        .sort((left, right) => new Date(left.dateEcheance).getTime() - new Date(right.dateEcheance).getTime())
        .slice(0, 6),
    [filteredMilestones]
  );

  const portfolioRows = useMemo(
    () =>
      [...filteredProjects]
        .sort((left, right) => {
          const leftDate = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
          const rightDate = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
          return rightDate - leftDate;
        })
        .slice(0, 8),
    [filteredProjects]
  );

  const quickModules = [
    {
      title: 'Projets',
      description: 'Portefeuille, budgets et responsables.',
      href: '/dashboard/projets/liste',
      icon: FolderKanban,
    },
    {
      title: 'Tâches & Planning',
      description: 'Backlog, suivi des charges et priorités.',
      href: '/dashboard/projets/taches',
      icon: ClipboardList,
    },
    {
      title: 'Jalons',
      description: 'Échéances clés et livrables à piloter.',
      href: '/dashboard/projets/jalons',
      icon: Award,
    },
    {
      title: 'Planning Gantt',
      description: 'Vision chronologique des projets et tâches.',
      href: '/dashboard/projets/planning',
      icon: CalendarDays,
    },
    {
      title: 'Feuilles de Temps',
      description: 'Temps saisis, validation et charge projet.',
      href: '/dashboard/timesheets',
      icon: Clock3,
    },
  ];
  return {
    period,
    setPeriod,
    managerFilter,
    setManagerFilter,
    projectsResponse,
    loadingProjects,
    statsResponse,
    loadingStats,
    tasksResponse,
    loadingTasks,
    jalonsResponse,
    loadingJalons,
    timesheets,
    loadingTimesheets,
    isLoading,
    projects,
    tasks,
    milestones,
    projectStats,
    periodStart,
    managerOptions,
    filteredProjects,
    filteredProjectIds,
    filteredTasks,
    filteredMilestones,
    filteredTimesheets,
    kpis,
    statusChartData,
    tasksChartData,
    workloadChartData,
    upcomingMilestones,
    portfolioRows,
    quickModules,
  };
}
