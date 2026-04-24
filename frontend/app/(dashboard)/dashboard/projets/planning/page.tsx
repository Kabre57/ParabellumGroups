'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsService, jalonsService } from '@/shared/api/projects';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type GanttItem = {
  id: string;
  label: string;
  projectId?: string;
  start: Date;
  end: Date;
  color: string;
  type: 'TASK' | 'JALON';
};

export default function GanttPage() {
  const [projectId, setProjectId] = useState<string>('ALL');

  const { data: projectsResp } = useQuery({
    queryKey: ['projects-mini'],
    queryFn: () => projectsService.getProjects({ limit: 100 }),
  });
  const projects = projectsResp?.data ?? [];

  const { data: tasksResp } = useQuery({
    queryKey: ['tasks-gantt'],
    queryFn: () => projectsService.getTasks({}),
  });
  const { data: jalonsResp } = useQuery({
    queryKey: ['jalons-gantt'],
    queryFn: () => jalonsService.getJalons({}),
  });

  const items: GanttItem[] = useMemo(() => {
    const t = (tasksResp?.data ?? []).map((task) => {
      const start = task.createdAt ? new Date(task.createdAt) : new Date();
      const end = task.dueDate ? new Date(task.dueDate) : start;
      return {
        id: task.id,
        label: task.title,
        projectId: task.projectId,
        start,
        end,
        color: '#3b82f6',
        type: 'TASK' as const,
      };
    });
    const j = (jalonsResp?.data ?? []).map((jalon) => {
      const d = jalon.dateEcheance ? new Date(jalon.dateEcheance) : new Date();
      return {
        id: jalon.id,
        label: jalon.nom,
        projectId: jalon.projetId,
        start: d,
        end: d,
        color: '#10b981',
        type: 'JALON' as const,
      };
    });
    return [...t, ...j];
  }, [tasksResp, jalonsResp]);

  const filtered = items.filter((i) => projectId === 'ALL' || i.projectId === projectId);
  const allDates = filtered.flatMap((i) => [i.start, i.end]);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();
  const totalDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name || id || '—';

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Planning Gantt</h1>
          <p className="text-sm text-muted-foreground">Vue simple des tâches et jalons.</p>
        </div>
        <div className="w-64">
          <Label>Projet</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger><SelectValue placeholder="Tous les projets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((item) => {
          const startOffset = Math.max(0, Math.round((item.start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
          const duration = Math.max(1, Math.round((item.end.getTime() - item.start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          const left = (startOffset / totalDays) * 100;
          const width = (duration / totalDays) * 100;
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span className="font-semibold">{item.label}</span>
                <span>{projectName(item.projectId)}</span>
              </div>
              <div className="relative h-6 bg-gray-100 rounded">
                <div
                  className="absolute h-6 rounded text-white text-[11px] flex items-center justify-center"
                  style={{ left: `${left}%`, width: `${width}%`, backgroundColor: item.color, minWidth: 60 }}
                >
                  {item.type === 'JALON' ? 'Jalon' : 'Tâche'}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-gray-500">Aucun élément à afficher.</div>}
      </div>
    </Card>
  );
}
