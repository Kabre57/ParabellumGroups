'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services/projects';
import { ProjectStatus, type Project } from '@/shared/api/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<ProjectStatus, string> = {
  PLANNING: 'bg-gray-200 text-gray-800',
  ACTIVE: 'bg-blue-200 text-blue-800',
  ON_HOLD: 'bg-yellow-200 text-yellow-800',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

const statusLabels: Record<ProjectStatus, string> = {
  PLANNING: 'Planifie',
  ACTIVE: 'En cours',
  ON_HOLD: 'Suspendu',
  COMPLETED: 'Termine',
  CANCELLED: 'Annule',
};

const emptyForm = {
  name: '',
  description: '',
  customerId: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  budget: '',
  managerId: '',
  status: ProjectStatus.PLANNING,
  priority: 'MEDIUM',
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { canCreate, canUpdate } = getCrudVisibility(user, {
    read: ['projects.read', 'projects.read_all', 'projects.read_assigned'],
    create: ['projects.create'],
    update: ['projects.update', 'projects.change_status', 'projects.manage_budget', 'projects.manage_team'],
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () =>
      projectsService.getProjects({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const projects = response?.data ?? [];
  const filteredProjects = projects.filter((project) => {
    const clientLabel = (project.clientName || project.customer?.companyName || project.customerId || '').toLowerCase();
    return !clientFilter || clientLabel.includes(clientFilter.toLowerCase());
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectsService.createProject({
        name: form.name,
        description: form.description || undefined,
        customerId: form.customerId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        managerId: form.managerId,
        status: form.status,
        priority: form.priority as any,
      }),
    onSuccess: () => {
      toast.success('Projet cree');
      qc.invalidateQueries({ queryKey: ['projects'] });
      setEditing(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Creation impossible'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      projectsService.updateProject(editing!.id, {
        name: form.name,
        description: form.description || undefined,
        customerId: form.customerId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        managerId: form.managerId,
        status: form.status,
        priority: form.priority as any,
      }),
    onSuccess: () => {
      toast.success('Projet mis a jour');
      qc.invalidateQueries({ queryKey: ['projects'] });
      setEditing(null);
    },
    onError: () => toast.error('Mise a jour impossible'),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditing({} as Project);
  };

  const openEdit = (project: Project) => {
    setForm({
      name: project.name || '',
      description: project.description || '',
      customerId: project.customerId || '',
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      budget: project.budget ? String(project.budget) : '',
      managerId: project.managerId || '',
      status: project.status,
      priority: (project.priority as string) || 'MEDIUM',
    });
    setEditing(project);
  };

  const save = () => {
    if (!form.name || !form.customerId || !form.managerId || !form.startDate) {
      toast.error('Nom, client, manager et date de debut sont requis');
      return;
    }

    if (editing?.id) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projets</h1>
          <p className="text-sm text-gray-600">Suivi global des projets, budgets et responsables.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>Nouveau projet</Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Statut</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'ALL')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value={ProjectStatus.PLANNING}>Planifie</SelectItem>
                <SelectItem value={ProjectStatus.ACTIVE}>En cours</SelectItem>
                <SelectItem value={ProjectStatus.ON_HOLD}>Suspendu</SelectItem>
                <SelectItem value={ProjectStatus.COMPLETED}>Termine</SelectItem>
                <SelectItem value={ProjectStatus.CANCELLED}>Annule</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Client</Label>
            <Input
              placeholder="Filtrer par client"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Projet</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3 text-left">Budget</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center">Chargement...</td>
              </tr>
            )}
            {!isLoading && filteredProjects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Aucun projet</td>
              </tr>
            )}
            {filteredProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-gray-500">{project.projectNumber || project.id.slice(0, 8)}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{project.clientName || project.customer?.companyName || project.customerId || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : project.managerId}</td>
                <td className="px-4 py-3 text-gray-600">{project.budget ? `${project.budget.toLocaleString()} ${project.currency || 'F'}` : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[project.status]}`}>
                    {statusLabels[project.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-sm">
                    <Link href={`/dashboard/projets/${project.id}`} className="text-blue-600 hover:text-blue-800">
                      Voir
                    </Link>
                    {canUpdate && (
                      <button className="text-gray-600 hover:text-gray-900" onClick={() => openEdit(project)}>
                        Editer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(canCreate || canUpdate) && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing.id ? 'Editer le projet' : 'Nouveau projet'}</h3>
              <button onClick={() => setEditing(null)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Client *</Label>
                <Input value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
              </div>
              <div>
                <Label>Manager *</Label>
                <Input value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} />
              </div>
              <div>
                <Label>Budget</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div>
                <Label>Date de debut *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as ProjectStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ProjectStatus.PLANNING}>Planifie</SelectItem>
                    <SelectItem value={ProjectStatus.ACTIVE}>En cours</SelectItem>
                    <SelectItem value={ProjectStatus.ON_HOLD}>Suspendu</SelectItem>
                    <SelectItem value={ProjectStatus.COMPLETED}>Termine</SelectItem>
                    <SelectItem value={ProjectStatus.CANCELLED}>Annule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorite</Label>
                <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button onClick={save} disabled={createMutation.isPending || updateMutation.isPending}>
                {editing.id ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
