'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/shared/api/projects';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function JalonsPage() {
  const [projectId, setProjectId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const { data: projectsResp } = useQuery({
    queryKey: ['projects-mini'],
    queryFn: () => projectsService.getProjects({ pageSize: 100 }),
  });
  const projects = projectsResp?.data ?? [];

  const { data: jalonsResp, isLoading } = useQuery({
    queryKey: ['jalons', projectId, status, search],
    queryFn: () => projectsService.getMilestones({
      projectId: projectId || undefined,
      status: status !== 'ALL' ? status : undefined,
      search: search || undefined,
    }),
  });

  const jalons = jalonsResp?.data ?? [];

  const statusColors: Record<string, string> = {
    PLANNED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    DONE: 'bg-green-100 text-green-700',
    BLOCKED: 'bg-red-100 text-red-700',
  };

  const statusLabel: Record<string, string> = {
    PLANNED: 'Planifié',
    IN_PROGRESS: 'En cours',
    DONE: 'Terminé',
    BLOCKED: 'Bloqué',
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground">Gestion de Projets</p>
        <h1 className="text-3xl font-bold">Jalons</h1>
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="PLANNED">Planifié</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="DONE">Terminé</SelectItem>
                <SelectItem value="BLOCKED">Bloqué</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Recherche</Label>
            <Input placeholder="Nom, responsable..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Projet</th>
                  <th className="p-3 text-left">Responsable</th>
                  <th className="p-3 text-left">Échéance</th>
                  <th className="p-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {jalons.map((m:any) => (
                  <tr key={m.id} className="border-t hover:bg-muted/40">
                    <td className="p-3 font-medium">{m.titre || m.title}</td>
                    <td className="p-3 text-sm">{m.project?.name || m.projetId || '—'}</td>
                    <td className="p-3 text-sm">{m.owner?.fullName || m.responsable || '—'}</td>
                    <td className="p-3 text-sm">{m.dateEcheance ? new Date(m.dateEcheance).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-3"><Badge className={statusColors[m.status] || 'bg-gray-100 text-gray-700'}>{statusLabel[m.status] || m.status}</Badge></td>
                  </tr>
                ))}
                {jalons.length === 0 && (
                  <tr><td className="p-4 text-center text-muted-foreground" colSpan={5}>Aucun jalon</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}