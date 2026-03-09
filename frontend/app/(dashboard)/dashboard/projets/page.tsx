'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services/projects';
import { ProjectStatus, type Project } from '@/shared/api/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  PLANNING: 'Planifié',
  ACTIVE: 'En cours',
  ON_HOLD: 'Suspendu',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [editing, setEditing] = useState<Project | null>(null); // null=fermé, {}=création, projet=édition
  const [form, setForm] = useState({
    name: '',
    description: '',
    customerId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    budget: '',
    managerId: '',
    status: ProjectStatus.PLANNING,
    priority: 'MEDIUM',
  });

  const qc = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['projects', statusFilter, clientFilter],
    queryFn: () =>
      projectsService.getProjects({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const projects = response?.data ?? [];

  const filteredProjects = projects.filter((project) => {
    const clientLabel = (project.clientName || project.customer?.companyName || project.customerId || '').toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    const matchesClient = !clientFilter || clientLabel.includes(clientFilter.toLowerCase());
    return matchesStatus && matchesClient;
  });

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'ACTIVE').length,
    completed: projects.filter((p) => p.status === 'COMPLETED').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

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
      toast.success('Projet créé');
      qc.invalidateQueries({ queryKey: ['projects'] });
      setEditing(null);
    },
    onError: () => toast.error('Création impossible'),
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
      toast.success('Projet mis à jour');
      qc.invalidateQueries({ queryKey: ['projects'] });
      setEditing(null);
    },
    onError: () => toast.error('Mise à jour impossible'),
  });

  const openCreate = () => {
    setForm({
      name: '',
      description: '',
      customerId: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      budget: '',
      managerId: '',
      status: ProjectStatus.PLANNING,
      priority: 'MEDIUM',
    });
    setEditing({} as Project);
  };

  const openEdit = (p: Project) => {
    setForm({
      name: p.name || '',
      description: p.description || '',
      customerId: p.customerId || '',
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      budget: p.budget ? String(p.budget) : '',
      managerId: p.managerId || '',
      status: p.status,
      priority: (p.priority as any) || 'MEDIUM',
    });
    setEditing(p);
  };

  const save = () => {
    if (!form.name || !form.customerId || !form.managerId || !form.startDate) {
      toast.error('Nom, client, manager et date de début sont requis');
      return;
    }
    if (editing && editing.id) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projets</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={openCreate}>
          Nouveau projet
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Actifs</div>
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Terminés</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Budget total</div>
          <div className="text-2xl font-bold">{stats.totalBudget.toLocaleString()} F</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous</option>
              <option value="PLANNING">Planifié</option>
              <option value="ACTIVE">En cours</option>
              <option value="ON_HOLD">Suspendu</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <input
              type="text"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progression</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project) => {
                  const projectNumber = project.projectNumber || project.id.slice(0, 8);
                  const clientLabel = project.clientName || project.customer?.companyName || project.customerId || '—';
                  const startDateLabel = project.startDate ? new Date(project.startDate).toLocaleDateString() : '—';
                  const endDateLabel = project.endDate ? new Date(project.endDate).toLocaleDateString() : '—';
                  const budgetValue = project.budget ?? 0;
                  const completion = project.completion ?? 0;

                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{projectNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{project.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{clientLabel}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {startDateLabel} - {endDateLabel}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{budgetValue.toLocaleString()} F</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${completion}%` }}></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12">{completion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <a
                            href={`/dashboard/projets/${project.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Voir
                          </a>
                          <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => openEdit(project)}>
                            Éditer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucun projet trouvé</div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{editing.id ? 'Éditer le projet' : 'Nouveau projet'}</h3>
              <button onClick={() => setEditing(null)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Client / customerId *</Label>
                <Input value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
              </div>
              <div>
                <Label>ManagerId *</Label>
                <Input value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} />
              </div>
              <div>
                <Label>Budget</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div>
                <Label>Début *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planifié</SelectItem>
                    <SelectItem value="ACTIVE">En cours</SelectItem>
                    <SelectItem value="ON_HOLD">Suspendu</SelectItem>
                    <SelectItem value="COMPLETED">Terminé</SelectItem>
                    <SelectItem value="CANCELLED">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button onClick={save} disabled={createMutation.isPending || updateMutation.isPending}>
                {editing.id ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
