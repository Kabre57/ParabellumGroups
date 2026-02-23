'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/shared/api/projects';
import { TaskBoard } from '@/components/projects/TaskBoard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function TasksPage() {
  const [projectId, setProjectId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: projectsResp } = useQuery({
    queryKey: ['projects-mini'],
    queryFn: () => projectsService.getProjects({ pageSize: 100 }),
  });
  const projects = projectsResp?.data ?? [];

  const { data: tasksResp, isLoading } = useQuery({
    queryKey: ['tasks', projectId, statusFilter, search],
    queryFn: () =>
      projectsService.getTasks({
        projectId: projectId || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });

  const tasks = tasksResp?.data ?? [];
  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    blocked: tasks.filter((t) => t.status === 'BLOCKED').length,
  };

  const renderStatus = (s: string) => {
    const map: Record<string, string> = {
      TODO: 'bg-gray-200 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      IN_REVIEW: 'bg-purple-100 text-purple-700',
      DONE: 'bg-green-100 text-green-700',
      BLOCKED: 'bg-red-100 text-red-700',
    };
    const label: Record<string, string> = {
      TODO: 'À faire',
      IN_PROGRESS: 'En cours',
      IN_REVIEW: 'Revue',
      DONE: 'Terminé',
      BLOCKED: 'Bloqué',
    };
    return <Badge className={map[s] || 'bg-gray-100 text-gray-700'}>{label[s] || s}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tâches & Planning</p>
          <h1 className="text-3xl font-bold">Tâches</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">En cours</p><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Terminées</p><p className="text-2xl font-bold text-green-600">{stats.done}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Bloquées</p><p className="text-2xl font-bold text-red-600">{stats.blocked}</p></Card>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Projet</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Tous les projets" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les projets</SelectItem>
                {projects.map((p:any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="TODO">À faire</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="IN_REVIEW">Revue</SelectItem>
                <SelectItem value="DONE">Terminé</SelectItem>
                <SelectItem value="BLOCKED">Bloqué</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Recherche</Label>
            <Input placeholder="Titre, assigné, projet..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : projectId ? (
          <TaskBoard projectId={projectId} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Titre</th>
                  <th className="p-3 text-left">Projet</th>
                  <th className="p-3 text-left">Assigné</th>
                  <th className="p-3 text-left">Échéance</th>
                  <th className="p-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t:any) => (
                  <tr key={t.id} className="border-t hover:bg-muted/40">
                    <td className="p-3 font-medium">{t.title}</td>
                    <td className="p-3 text-sm">{t.project?.name || t.projectId || '—'}</td>
                    <td className="p-3 text-sm">{t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Non assigné'}</td>
                    <td className="p-3 text-sm">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-3">{renderStatus(t.status)}</td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td className="p-4 text-center text-muted-foreground" colSpan={5}>Aucune tâche</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}