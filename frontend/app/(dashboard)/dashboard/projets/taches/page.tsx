'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/shared/api/projects';
import { Task } from '@/shared/api/projects/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';

type Status = Task['status'] | 'ALL';
type Priority = Task['priority'];

const statusLabel: Record<Task['status'], string> = {
  TODO: 'A faire',
  IN_PROGRESS: 'En cours',
  IN_REVIEW: 'Revue',
  DONE: 'Termine',
  BLOCKED: 'Bloque',
};

const priorityLabel: Record<Priority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

export default function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status>('ALL');
  const [editing, setEditing] = useState<Task | null>(null);
  const [showAssign, setShowAssign] = useState<Task | null>(null);
  const [showComplete, setShowComplete] = useState<Task | null>(null);
  const [assignUser, setAssignUser] = useState('');
  const [completeHours, setCompleteHours] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: 'NONE',
    status: 'TODO' as Task['status'],
    priority: 'MEDIUM' as Priority,
    dueDate: '',
    assignedToId: '',
    estimatedHours: '',
  });

  const { canCreate, canUpdate, canApprove } = getCrudVisibility(user, {
    read: ['tasks.read', 'tasks.read_all', 'tasks.read_assigned'],
    create: ['tasks.create'],
    update: ['tasks.update', 'tasks.comment'],
    approve: ['tasks.assign', 'tasks.change_status'],
  });

  const { data: projectsResp } = useQuery({ queryKey: ['projects-mini'], queryFn: () => projectsService.getProjects({ limit: 100 }) });
  const projects = projectsResp?.data ?? [];

  const { data: tasksResp, isLoading } = useQuery({
    queryKey: ['tasks', projectId, statusFilter, search],
    queryFn: () =>
      projectsService.getTasks({
        projectId: projectId === 'ALL' ? undefined : projectId,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });
  const tasks = tasksResp?.data ?? [];

  const stats = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((t) => t.status === 'DONE').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      blocked: tasks.filter((t) => t.status === 'BLOCKED').length,
    }),
    [tasks],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      projectsService.createTask({
        title: form.title,
        description: form.description || undefined,
        projectId: form.projectId,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        assignedToId: form.assignedToId || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      }),
    onSuccess: () => {
      toast.success('Tache creee');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      projectsService.updateTask(editing!.id, {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        assignedToId: form.assignedToId || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      }),
    onSuccess: () => {
      toast.success('Tache mise a jour');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setEditing(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => projectsService.assignTask(showAssign!.id, assignUser),
    onSuccess: () => {
      toast.success('Tache assignee');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setShowAssign(null);
      setAssignUser('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => projectsService.completeTask(showComplete!.id, completeHours ? Number(completeHours) : undefined),
    onSuccess: () => {
      toast.success('Tache terminee');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setShowComplete(null);
      setCompleteHours('');
    },
  });

  const openCreate = () => {
    setEditing({} as Task);
    setForm({
      title: '',
      description: '',
      projectId: projectId === 'ALL' ? 'NONE' : projectId,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: '',
      assignedToId: '',
      estimatedHours: '',
    });
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      projectId: task.projectId || 'NONE',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assignedToId: task.assignedToId || '',
      estimatedHours: task.estimatedHours ? String(task.estimatedHours) : '',
    });
  };

  const saveTask = () => {
    if (!form.title || !form.projectId || form.projectId === 'NONE') {
      toast.error('Titre et projet sont requis');
      return;
    }
    if (editing?.id) updateMutation.mutate();
    else createMutation.mutate();
  };

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || id;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Taches</h1>
          <p className="text-sm text-muted-foreground">Creer, assigner et cloturer les taches de projet.</p>
        </div>
        {canCreate && <Button onClick={openCreate}>Nouvelle tache</Button>}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="En cours" value={stats.inProgress} tone="info" />
        <StatCard label="Terminees" value={stats.done} tone="success" />
        <StatCard label="Bloquees" value={stats.blocked} tone="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <Label>Projet</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger><SelectValue placeholder="Tous les projets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="TODO">A faire</SelectItem>
              <SelectItem value="IN_PROGRESS">En cours</SelectItem>
              <SelectItem value="IN_REVIEW">Revue</SelectItem>
              <SelectItem value="DONE">Termine</SelectItem>
              <SelectItem value="BLOCKED">Bloque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Recherche</Label>
          <Input placeholder="Rechercher par titre ou assigne" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Titre</th>
              <th className="px-4 py-3 text-left">Projet</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Priorite</th>
              <th className="px-4 py-3 text-left">Echeance</th>
              <th className="px-4 py-3 text-left">Assigne</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td className="px-4 py-4" colSpan={7}>Chargement...</td></tr>}
            {!isLoading && tasks.length === 0 && <tr><td className="px-4 py-4 text-gray-500" colSpan={7}>Aucune tache trouvee</td></tr>}
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{task.title}</td>
                <td className="px-4 py-3 text-gray-600">{projectName(task.projectId)}</td>
                <td className="px-4 py-3"><Badge>{statusLabel[task.status]}</Badge></td>
                <td className="px-4 py-3">{priorityLabel[task.priority]}</td>
                <td className="px-4 py-3 text-gray-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-gray-600">{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : task.assignedToId || 'Non assigne'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {canUpdate && <Button variant="outline" size="sm" onClick={() => openEdit(task)}>Editer</Button>}
                    {canApprove && <Button variant="outline" size="sm" onClick={() => { setShowAssign(task); setAssignUser(task.assignedToId || ''); }}>Assigner</Button>}
                    {canApprove && <Button variant="outline" size="sm" onClick={() => { setShowComplete(task); setCompleteHours(''); }}>Terminer</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(canCreate || canUpdate) && editing && (
        <Modal title={editing.id ? 'Editer la tache' : 'Nouvelle tache'} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Projet *</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Choisir</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Task['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">A faire</SelectItem>
                  <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                  <SelectItem value="IN_REVIEW">Revue</SelectItem>
                  <SelectItem value="DONE">Termine</SelectItem>
                  <SelectItem value="BLOCKED">Bloque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorite</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Basse</SelectItem>
                  <SelectItem value="MEDIUM">Moyenne</SelectItem>
                  <SelectItem value="HIGH">Haute</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Echeance</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>Assigne a</Label><Input value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} /></div>
            <div><Label>Heures estimees</Label><Input type="number" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={saveTask} disabled={createMutation.isPending || updateMutation.isPending}>{editing.id ? 'Mettre a jour' : 'Creer'}</Button>
          </div>
        </Modal>
      )}

      {canApprove && showAssign && (
        <Modal title={`Assigner \"${showAssign.title}\"`} onClose={() => setShowAssign(null)}>
          <Label>Utilisateur (userId)</Label>
          <Input value={assignUser} onChange={(e) => setAssignUser(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAssign(null)}>Annuler</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !assignUser}>Assigner</Button>
          </div>
        </Modal>
      )}

      {canApprove && showComplete && (
        <Modal title={`Cloturer \"${showComplete.title}\"`} onClose={() => setShowComplete(null)}>
          <Label>Heures reelles (optionnel)</Label>
          <Input type="number" value={completeHours} onChange={(e) => setCompleteHours(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowComplete(null)}>Annuler</Button>
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>Marquer termine</Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'info' | 'success' | 'danger' }) {
  const toneMap: Record<'neutral' | 'info' | 'success' | 'danger', string> = {
    neutral: 'bg-gray-50 text-gray-900',
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    danger: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`p-4 rounded-lg ${toneMap[tone]}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
