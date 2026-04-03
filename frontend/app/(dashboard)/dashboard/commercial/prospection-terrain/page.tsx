'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, PhoneCall, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { commercialService } from '@/shared/api/commercial/commercial.service';
import type { Prospect, TerrainVisit } from '@/shared/api/commercial/types';

const ProspectionTerrainMap = dynamic(
  () => import('@/components/commercial/terrain/ProspectionTerrainMap'),
  { ssr: false }
);

export default function ProspectionTerrainPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error: queryError } = useQuery<Prospect[]>({
    queryKey: ['prospects-terrain'],
    queryFn: () => commercialService.getProspects({ limit: 50 }),
  });
  const {
    data: visitData,
    isLoading: visitsLoading,
    error: visitsError,
  } = useQuery<TerrainVisit[]>({
    queryKey: ['terrain-visits'],
    queryFn: () => commercialService.getTerrainVisits(),
  });
  const { data: dueVisitsData } = useQuery<TerrainVisit[]>({
    queryKey: ['terrain-visits-due'],
    queryFn: () => commercialService.getTerrainVisits({ due: true }),
  });
  const prospects = Array.isArray(data) ? data : [];

  const terrainProspects = useMemo(
    () => prospects.filter((prospect) => !prospect.isConverted),
    [prospects]
  );
  const visitsToPlan = terrainProspects.slice(0, 6);
  const zoneStats = useMemo(() => {
    const resolveZone = (prospect: Prospect) => {
      const city = (prospect.city || '').trim();
      if (city) return city;
      const address = (prospect.address || '').trim();
      if (address) return address.split(',')[0].trim();
      return (prospect.country || 'Non defini').trim();
    };
    const stats = terrainProspects.reduce((acc, prospect) => {
      const zone = resolveZone(prospect);
      acc[zone] = (acc[zone] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [terrainProspects]);
  const planning = useMemo(() => {
    const rows = Array.isArray(visitData) ? visitData : [];
    return rows.map((visit) => ({
      id: visit.id,
      prospect: visit.prospect,
      scheduledAt: new Date(visit.scheduledAt),
      assignee: visit.assignee || 'Commercial',
      status: visit.status || 'PLANIFIEE',
      note: visit.note || '',
      outcome: visit.outcome || '',
    }));
  }, [visitData]);

  const dueVisitsCount = Array.isArray(dueVisitsData) ? dueVisitsData.length : 0;

  const visitAssignments = [
    { value: 'Chef de projet', label: 'Chef de projet' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Technicien', label: 'Technicien' },
  ];
  const visitStatuses = [
    { value: 'PLANIFIEE', label: 'Planifiee' },
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'TERMINEE', label: 'Terminee' },
    { value: 'ANNULEE', label: 'Annulee' },
  ];
  const statusBadgeVariant = (status: string) => {
    if (status === 'TERMINEE') return 'secondary';
    if (status === 'EN_COURS') return 'default';
    if (status === 'ANNULEE') return 'destructive';
    return 'outline';
  };

  const [planningRows, setPlanningRows] = useState<typeof planning>([]);
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [newVisit, setNewVisit] = useState({
    prospectId: '',
    date: '',
    assignee: 'Commercial',
    status: 'PLANIFIEE',
    note: '',
  });

  useEffect(() => {
    setPlanningRows(planning);
  }, [planning]);

  const updateVisit = (id: string, updates: Partial<(typeof planning)[number]>) => {
    setPlanningRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const createVisitMutation = useMutation({
    mutationFn: commercialService.createTerrainVisit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terrain-visits'] }),
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ visitId, payload }: { visitId: string; payload: any }) =>
      commercialService.updateTerrainVisit(visitId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terrain-visits'] }),
  });

  const selectedVisit = planningRows.find((row) => row.id === selectedVisitId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Prospection terrain</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Suivi des visites, actions terrain et opportunites a relancer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/commercial/prospects">Retour prospection</Link>
          </Button>
          <Button onClick={() => setNewVisitOpen(true)}>Nouveau passage</Button>
        </div>
      </div>

      {queryError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger la prospection terrain pour le moment.
        </div>
      ) : null}
      {visitsError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Impossible de charger le planning terrain pour le moment.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Visites planifiees</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{visitsToPlan.length}</div>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Relances terrain</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dueVisitsCount}</div>
            <p className="text-xs text-muted-foreground">Relances a faire</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prospects a visiter</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{terrainProspects.length}</div>
            <p className="text-xs text-muted-foreground">Base locale</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carte des zones</CardTitle>
          <CardDescription>
            Planifiez les visites et regroupez les prospects par zone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <ProspectionTerrainMap prospects={terrainProspects} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {zoneStats.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Aucune zone identifiee pour le moment.
              </div>
            ) : (
              zoneStats.map(([zone, count]) => (
                <div key={zone} className="rounded-lg border px-4 py-3">
                  <div className="text-xs text-muted-foreground">Zone</div>
                  <div className="text-sm font-semibold">{zone}</div>
                  <div className="text-xs text-muted-foreground">{count} prospects</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planning des visites</CardTitle>
          <CardDescription>Planifiez les passages terrain a venir.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || visitsLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Spinner className="mr-2 h-4 w-4" /> Chargement des prospects terrain...
            </div>
          ) : planning.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
              Aucune visite planifiee. Utilisez "Nouveau passage" pour creer votre planning terrain.
            </div>
          ) : (
            <div className="space-y-3">
              {planningRows.map(({ id, prospect, scheduledAt, assignee, status, note }) => (
                <div key={id} className="grid gap-3 rounded-lg border px-4 py-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-center">
                  <div>
                    <div className="text-sm font-medium">{prospect.companyName}</div>
                    <div className="text-xs text-muted-foreground">{prospect.city || 'Zone a definir'}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {prospect.address || 'Adresse non renseignee'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Visite: {scheduledAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="w-full rounded-md border px-2 py-1 text-xs md:w-auto"
                      value={assignee}
                      onChange={(event) => {
                        const nextAssignee = event.target.value;
                        updateVisit(id, { assignee: nextAssignee });
                        updateVisitMutation.mutate({
                          visitId: id,
                          payload: { assignee: nextAssignee },
                        });
                      }}
                    >
                      {visitAssignments.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="w-full rounded-md border px-2 py-1 text-xs md:w-auto"
                      value={status}
                      onChange={(event) => {
                        const nextStatus = event.target.value;
                        updateVisit(id, { status: nextStatus });
                        updateVisitMutation.mutate({
                          visitId: id,
                          payload: { status: nextStatus },
                        });
                      }}
                    >
                      {visitStatuses.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Badge variant={statusBadgeVariant(status)}>{visitStatuses.find((item) => item.value === status)?.label || status}</Badge>
                  </div>
                  <div className="flex gap-2 md:justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewVisit({
                          prospectId: prospect.id,
                          date: scheduledAt.toISOString().slice(0, 10),
                          assignee,
                          status,
                          note,
                        });
                        setNewVisitOpen(true);
                      }}
                    >
                      Planifier
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedVisitId(id);
                        setReportOpen(true);
                      }}
                    >
                      Compte-rendu
                    </Button>
                  </div>
                  {note ? (
                    <div className="text-xs text-muted-foreground md:col-span-5">
                      Dernier compte-rendu: {note}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={newVisitOpen} onOpenChange={setNewVisitOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau passage terrain</DialogTitle>
            <DialogDescription>Planifiez une nouvelle visite terrain.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Prospect</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={newVisit.prospectId}
                onChange={(event) => setNewVisit((prev) => ({ ...prev, prospectId: event.target.value }))}
              >
                <option value="">Selectionner un prospect</option>
                {terrainProspects.map((prospect) => (
                  <option key={prospect.id} value={prospect.id}>
                    {prospect.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <Input
                  type="date"
                  value={newVisit.date}
                  onChange={(event) => setNewVisit((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Assignation</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={newVisit.assignee}
                  onChange={(event) => setNewVisit((prev) => ({ ...prev, assignee: event.target.value }))}
                >
                  {visitAssignments.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Statut</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={newVisit.status}
                onChange={(event) => setNewVisit((prev) => ({ ...prev, status: event.target.value }))}
              >
                {visitStatuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Note</label>
              <Textarea
                value={newVisit.note}
                onChange={(event) => setNewVisit((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Ajouter un contexte terrain..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewVisitOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  const prospect = terrainProspects.find((item) => item.id === newVisit.prospectId);
                  if (!prospect) return;
                  createVisitMutation.mutate(
                    {
                      prospectId: prospect.id,
                      scheduledAt: newVisit.date ? new Date(newVisit.date).toISOString() : new Date().toISOString(),
                      assignee: newVisit.assignee,
                      status: newVisit.status,
                      note: newVisit.note,
                    },
                    {
                      onSuccess: () => {
                        setNewVisitOpen(false);
                        setNewVisit({
                          prospectId: '',
                          date: '',
                          assignee: 'Commercial',
                          status: 'PLANIFIEE',
                          note: '',
                        });
                      },
                    }
                  );
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compte-rendu visite</DialogTitle>
            <DialogDescription>Renseignez le compte-rendu de la visite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm font-medium">{selectedVisit?.prospect.companyName || 'Visite'}</div>
            <Textarea
              value={selectedVisit?.note || ''}
              onChange={(event) => {
                if (!selectedVisit) return;
                updateVisit(selectedVisit.id, { note: event.target.value });
              }}
              placeholder="Notes de visite, besoins, prochaine action..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReportOpen(false)}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  if (selectedVisit) {
                    updateVisitMutation.mutate({
                      visitId: selectedVisit.id,
                      payload: {
                        note: selectedVisit.note,
                        status: selectedVisit.note ? 'TERMINEE' : selectedVisit.status,
                      },
                    });
                  }
                  setReportOpen(false);
                }}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
