'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { projectsService } from '@/shared/api/projects';
import { crmService } from '@/shared/api/crm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'PLANIFIE', label: 'Planifié' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'SUSPENDU', label: 'Suspendu' },
  { value: 'TERMINE', label: 'Terminé' },
  { value: 'ANNULE', label: 'Annulé' },
];

const PRIORITY_OPTIONS = [
  { value: 'BASSE', label: 'Basse' },
  { value: 'MOYENNE', label: 'Moyenne' },
  { value: 'HAUTE', label: 'Haute' },
  { value: 'URGENTE', label: 'Urgente' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(value || 0)
    .replace('XOF', 'F CFA');

export default function ProjectsListPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    nom: '',
    description: '',
    clientId: '',
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: '',
    budget: '',
    status: 'PLANIFIE',
    priorite: 'MOYENNE',
  });

  const { data: projectsResponse, isLoading } = useQuery({
    queryKey: ['projects-list', search, statusFilter],
    queryFn: () =>
      projectsService.getProjects({
        limit: 200,
        search: search || undefined,
        status: statusFilter || undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
  });

  const { data: clientsResponse } = useQuery({
    queryKey: ['projects-clients'],
    queryFn: () => crmService.getClients({ limit: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.nom || !form.clientId || !form.dateDebut) {
        throw new Error('Nom, client et date de début sont obligatoires.');
      }
      const payload: any = {
        nom: form.nom,
        description: form.description || undefined,
        clientId: form.clientId,
        dateDebut: form.dateDebut,
        dateFin: form.dateFin || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        status: form.status,
        priorite: form.priorite,
        managerId: user?.id || '',
      };
      return projectsService.createProject(payload);
    },
    onSuccess: () => {
      toast.success('Projet créé avec succès.');
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
      setShowCreate(false);
      setForm({
        nom: '',
        description: '',
        clientId: '',
        dateDebut: new Date().toISOString().slice(0, 10),
        dateFin: '',
        budget: '',
        status: 'PLANIFIE',
        priorite: 'MOYENNE',
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Impossible de créer le projet");
    },
  });

  const projects = projectsResponse?.data ?? [];
  const clients = clientsResponse?.data ?? [];

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesStatus = !statusFilter || project.status === statusFilter;
        return matchesStatus;
      }),
    [projects, statusFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projets</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Créez et gérez vos projets, budgets, clients et échéances.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau projet
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par nom, client, numéro..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4">
                    <div className="font-semibold">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{project.projectNumber || project.id.slice(0, 6)}</div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {project.clientName || project.customer?.companyName || project.customerId || '-'}
                  </td>
                  <td className="px-4 py-4">{formatCurrency(project.budget || 0)}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : '-'}{' '}
                    {project.endDate ? `→ ${new Date(project.endDate).toLocaleDateString('fr-FR')}` : ''}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="secondary">{project.status}</Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/projets/${project.id}`}>Voir</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!filteredProjects.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Aucun projet disponible. Créez votre premier projet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Nom du projet *</span>
              <Input
                value={form.nom}
                onChange={(event) => setForm((prev) => ({ ...prev, nom: event.target.value }))}
                placeholder="Ex: Déploiement réseau"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Client *</span>
              <select
                value={form.clientId}
                onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.nom || client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Date de début *</span>
              <Input
                type="date"
                value={form.dateDebut}
                onChange={(event) => setForm((prev) => ({ ...prev, dateDebut: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Date de fin</span>
              <Input
                type="date"
                value={form.dateFin}
                onChange={(event) => setForm((prev) => ({ ...prev, dateFin: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Budget estimé</span>
              <Input
                type="number"
                value={form.budget}
                onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                placeholder="0"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Statut</span>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Priorité</span>
              <select
                value={form.priorite}
                onChange={(event) => setForm((prev) => ({ ...prev, priorite: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Objectifs, périmètre, livrables..."
              />
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création...' : 'Créer le projet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
