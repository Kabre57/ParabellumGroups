'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsService, jalonsService } from '@/shared/api/projects';
import { JalonStatus } from '@/shared/api/projects/jalons.service';
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

type StatusFilter = JalonStatus | 'ALL';

const statusLabel: Record<JalonStatus, string> = {
  PLANIFIE: 'Planifie',
  ATTEINT: 'Atteint',
  MANQUE: 'Manque',
};

export default function JalonsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ projetId: 'NONE', nom: '', description: '', dateEcheance: '', status: 'PLANIFIE' as JalonStatus });

  const { canCreate, canUpdate, canApprove } = getCrudVisibility(user, {
    read: ['projects.read', 'projects.read_all', 'projects.read_assigned'],
    create: ['projects.update'],
    update: ['projects.update'],
    approve: ['projects.change_status'],
  });

  const { data: projectsResp } = useQuery({ queryKey: ['projects-mini'], queryFn: () => projectsService.getProjects({ limit: 100 }) });
  const projects = projectsResp?.data ?? [];

  const { data: jalonsResp, isLoading } = useQuery({
    queryKey: ['jalons', projectId, status, search],
    queryFn: () => jalonsService.getJalons({ projetId: projectId === 'ALL' ? undefined : projectId, status: status !== 'ALL' ? status : undefined }),
  });

  const jalons = useMemo(
    () => (jalonsResp?.data ?? []).filter((j) => !search || j.nom.toLowerCase().includes(search.toLowerCase()) || (j.description || '').toLowerCase().includes(search.toLowerCase())),
    [jalonsResp, search],
  );

  const openCreate = () => {
    setEditing({} as any);
    setForm({ projetId: projectId === 'ALL' ? 'NONE' : projectId, nom: '', description: '', dateEcheance: '', status: 'PLANIFIE' });
  };

  const openEdit = (j: any) => {
    setEditing(j);
    setForm({ projetId: j.projetId || 'NONE', nom: j.nom || '', description: j.description || '', dateEcheance: j.dateEcheance ? j.dateEcheance.slice(0, 10) : '', status: j.status as JalonStatus });
  };

  const createMutation = useMutation({
    mutationFn: () => jalonsService.createJalon({ projetId: form.projetId, nom: form.nom, description: form.description || undefined, dateEcheance: form.dateEcheance }),
    onSuccess: () => { toast.success('Jalon cree'); qc.invalidateQueries({ queryKey: ['jalons'] }); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: () => jalonsService.updateJalon(editing!.id, { nom: form.nom, description: form.description || undefined, dateEcheance: form.dateEcheance || undefined, status: form.status }),
    onSuccess: () => { toast.success('Jalon mis a jour'); qc.invalidateQueries({ queryKey: ['jalons'] }); setEditing(null); },
  });

  const save = () => {
    if (!form.nom || !form.projetId || form.projetId === 'NONE' || !form.dateEcheance) {
      toast.error('Projet, nom et date sont requis');
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
          <h1 className="text-2xl font-bold">Jalons</h1>
          <p className="text-sm text-muted-foreground">Suivez les jalons cles des projets.</p>
        </div>
        {canCreate && <Button onClick={openCreate}>Nouveau jalon</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <Label>Projet</Label>
          <Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Tous les projets" /></SelectTrigger><SelectContent><SelectItem value="ALL">Tous</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tous</SelectItem><SelectItem value="PLANIFIE">Planifie</SelectItem><SelectItem value="ATTEINT">Atteint</SelectItem><SelectItem value="MANQUE">Manque</SelectItem></SelectContent></Select>
        </div>
        <div className="md:col-span-2">
          <Label>Recherche</Label>
          <Input placeholder="Nom ou description" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Nom</th><th className="px-4 py-3 text-left">Projet</th><th className="px-4 py-3 text-left">Echeance</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-left">Actions</th></tr></thead>
          <tbody className="divide-y">
            {isLoading && <tr><td className="px-4 py-4" colSpan={5}>Chargement...</td></tr>}
            {!isLoading && jalons.length === 0 && <tr><td className="px-4 py-4 text-gray-500" colSpan={5}>Aucun jalon</td></tr>}
            {jalons.map((j) => (
              <tr key={j.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{j.nom}</td>
                <td className="px-4 py-3 text-gray-600">{projectName(j.projetId)}</td>
                <td className="px-4 py-3 text-gray-600">{j.dateEcheance ? new Date(j.dateEcheance).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3"><Badge>{statusLabel[j.status]}</Badge></td>
                <td className="px-4 py-3"><div className="flex gap-2">{canUpdate && <Button variant="outline" size="sm" onClick={() => openEdit(j)}>Editer</Button>}{canApprove && <Button variant="outline" size="sm" onClick={() => jalonsService.updateJalonStatus(j.id, 'ATTEINT').then(() => { toast.success('Marque atteint'); qc.invalidateQueries({ queryKey: ['jalons'] }); })}>Marquer atteint</Button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(canCreate || canUpdate) && editing && (
        <Modal title={editing.id ? 'Editer le jalon' : 'Nouveau jalon'} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
            <div><Label>Projet *</Label><Select value={form.projetId} onValueChange={(v) => setForm({ ...form, projetId: v })}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent><SelectItem value="NONE">Choisir</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date d'echeance *</Label><Input type="date" value={form.dateEcheance} onChange={(e) => setForm({ ...form, dateEcheance: e.target.value })} /></div>
            <div><Label>Statut</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as JalonStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PLANIFIE">Planifie</SelectItem><SelectItem value="ATTEINT">Atteint</SelectItem><SelectItem value="MANQUE">Manque</SelectItem></SelectContent></Select></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button><Button onClick={save} disabled={createMutation.isPending || updateMutation.isPending}>{editing.id ? 'Mettre a jour' : 'Creer'}</Button></div>
        </Modal>
      )}
    </Card>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl p-6"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} className="p-1"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}
