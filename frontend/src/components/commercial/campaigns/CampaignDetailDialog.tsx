import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Calendar, Mail, MapPin, PhoneCall } from 'lucide-react';
import type { CampagneMail } from '@/shared/api/communication';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RelanceTask = {
  id: string;
  channel: 'EMAIL' | 'PHONE' | 'VISIT';
  dueAt: Date;
  label: string;
  status?: string;
  outcome?: string;
  step: number;
};

const CHANNEL_LABELS: Record<RelanceTask['channel'], string> = {
  EMAIL: 'Email',
  PHONE: 'Appel',
  VISIT: 'Visite',
};

const CHANNEL_ICON: Record<RelanceTask['channel'], ReactNode> = {
  EMAIL: <Mail className="h-4 w-4 text-blue-600" />,
  PHONE: <PhoneCall className="h-4 w-4 text-amber-600" />,
  VISIT: <MapPin className="h-4 w-4 text-emerald-600" />,
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getStatusBadge = (status?: string) => {
  if (!status) return { label: 'A faire', variant: 'outline' as const };
  if (status === 'TERMINEE') return { label: 'Terminee', variant: 'secondary' as const };
  if (status === 'EN_COURS') return { label: 'En cours', variant: 'default' as const };
  if (status === 'ANNULEE') return { label: 'Annulee', variant: 'destructive' as const };
  return { label: status.replace('_', ' '), variant: 'outline' as const };
};

type CampaignDetailDialogProps = {
  open: boolean;
  campaign: CampagneMail | null;
  onClose: () => void;
  onUpdateStep?: (campaignId: string, step: number, updates: { status?: string }) => void;
};

export function CampaignDetailDialog({ open, campaign, onClose, onUpdateStep }: CampaignDetailDialogProps) {
  const [callStatusFilter, setCallStatusFilter] = useState('ALL');
  const [callSearch, setCallSearch] = useState('');

  const tasks = useMemo(() => {
    if (!campaign) return [];
    const baseDate = new Date(campaign.dateEnvoi || campaign.createdAt || Date.now());
    const sequence = Array.isArray(campaign.sequence) ? campaign.sequence : [];
    return sequence
      .filter((step: any) => !(step?.channel === 'EMAIL' && step?.step === 1))
      .map((step: any) => {
        const channel = (step?.channel || 'EMAIL') as RelanceTask['channel'];
        const stepNumber = Number(step?.step || 0);
        const delayDays = Number(step?.delayDays || 0);
        return {
          id: `${campaign.id}-${stepNumber}`,
          channel,
          dueAt: addDays(baseDate, delayDays),
          label: `${CHANNEL_LABELS[channel]} ${stepNumber || ''}`.trim(),
          status: step?.status,
          outcome: step?.outcome,
          step: stepNumber,
        };
      })
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  }, [campaign]);

  const counts = useMemo(() => {
    const byChannel = tasks.reduce(
      (acc, task) => {
        acc[task.channel] += 1;
        return acc;
      },
      { EMAIL: 0, PHONE: 0, VISIT: 0 } as Record<RelanceTask['channel'], number>
    );
    return {
      rappels: tasks.length,
      relances: tasks.filter((task) => task.status !== 'TERMINEE').length,
      appels: byChannel.PHONE,
      emails: byChannel.EMAIL,
      visites: byChannel.VISIT,
      journal: tasks.length,
    };
  }, [tasks]);

  const defaultTab = useMemo(() => {
    const now = new Date();
    const urgent = tasks.find((task) => task.dueAt <= now && task.status !== 'TERMINEE');
    if (urgent) return 'relances';
    if (counts.appels) return 'appels';
    if (counts.emails) return 'emails';
    if (counts.visites) return 'visites';
    return 'rappels';
  }, [tasks, counts]);

  const callTasks = tasks.filter((task) => task.channel === 'PHONE');
  const filteredCalls = callTasks.filter((task) => {
    const matchStatus = callStatusFilter === 'ALL' || task.status === callStatusFilter;
    const matchSearch = task.label.toLowerCase().includes(callSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign.nom}</DialogTitle>
          <DialogDescription>
            Vue detaillee de la campagne et de ses relances.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-muted-foreground">Statut</div>
            <div className="text-sm font-medium">{campaign.status || '-'}</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-muted-foreground">Date d&apos;envoi</div>
            <div className="text-sm font-medium">{formatDate(campaign.dateEnvoi)}</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-xs text-muted-foreground">Destinataires</div>
            <div className="text-sm font-medium">{campaign.destinataires?.length || 0}</div>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="mt-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="rappels">Rappels ({counts.rappels})</TabsTrigger>
            <TabsTrigger value="relances">Relances ({counts.relances})</TabsTrigger>
            <TabsTrigger value="appels">Appels ({counts.appels})</TabsTrigger>
            <TabsTrigger value="emails">Emails ({counts.emails})</TabsTrigger>
            <TabsTrigger value="visites">Visites ({counts.visites})</TabsTrigger>
            <TabsTrigger value="journal">Journal ({counts.journal})</TabsTrigger>
          </TabsList>

          <TabsContent value="rappels" className="mt-4">
            <div className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3 text-sm font-semibold">Rappels automatiques</div>
              <div className="divide-y">
                {tasks.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Aucun rappel.</div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {CHANNEL_ICON[task.channel]}
                        {task.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</div>
                      <Badge variant={getStatusBadge(task.status).variant}>
                        {getStatusBadge(task.status).label}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="relances" className="mt-4">
            <div className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3 text-sm font-semibold">Relances a faire</div>
              <div className="divide-y">
                {tasks.filter((task) => task.status !== 'TERMINEE').length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Aucune relance en attente.</div>
                ) : (
                  tasks
                    .filter((task) => task.status !== 'TERMINEE')
                    .map((task) => (
                      <div key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {CHANNEL_ICON[task.channel]}
                          {task.label}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</div>
                        <Badge variant={getStatusBadge(task.status).variant}>
                          {getStatusBadge(task.status).label}
                        </Badge>
                        {onUpdateStep ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto"
                            onClick={() => onUpdateStep(campaign.id, task.step, { status: 'TERMINEE' })}
                          >
                            Marquer terminee
                          </Button>
                        ) : null}
                      </div>
                    ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appels" className="mt-4">
            <div className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold">Appels a effectuer</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Input
                    value={callSearch}
                    onChange={(event) => setCallSearch(event.target.value)}
                    placeholder="Rechercher un appel..."
                    className="w-full md:w-64"
                  />
                  <select
                    className="rounded-md border px-3 py-2 text-sm"
                    value={callStatusFilter}
                    onChange={(event) => setCallStatusFilter(event.target.value)}
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="A_FAIRE">A faire</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="TERMINEE">Terminee</option>
                    <option value="ANNULEE">Annulee</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Echeance</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalls.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          Aucun appel planifie.
                        </td>
                      </tr>
                    ) : (
                      filteredCalls.map((task) => (
                        <tr key={task.id} className="border-t">
                          <td className="px-4 py-3 font-medium">{task.label}</td>
                          <td className="px-4 py-3">{formatDate(task.dueAt)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusBadge(task.status).variant}>
                              {getStatusBadge(task.status).label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{task.outcome || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="emails" className="mt-4">
            <div className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3 text-sm font-semibold">Emails a envoyer</div>
              <div className="divide-y">
                {tasks.filter((task) => task.channel === 'EMAIL').length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Aucun email planifie.</div>
                ) : (
                  tasks
                    .filter((task) => task.channel === 'EMAIL')
                    .map((task) => (
                      <div key={task.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="text-sm font-medium">{task.label}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</div>
                        </div>
                        <Badge variant={getStatusBadge(task.status).variant}>
                          {getStatusBadge(task.status).label}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visites" className="mt-4">
            <div className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3 text-sm font-semibold">Visites a realiser</div>
              <div className="divide-y">
                {tasks.filter((task) => task.channel === 'VISIT').length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Aucune visite planifiee.</div>
                ) : (
                  tasks
                    .filter((task) => task.channel === 'VISIT')
                    .map((task) => (
                      <div key={task.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="text-sm font-medium">{task.label}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</div>
                        </div>
                        <Badge variant={getStatusBadge(task.status).variant}>
                          {getStatusBadge(task.status).label}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="journal" className="mt-4">
            <div className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3 text-sm font-semibold">Journal complet</div>
              <div className="divide-y">
                {tasks.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Aucune action.</div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between px-4 py-3">
                      <div className="text-sm font-medium">
                        {CHANNEL_LABELS[task.channel]} - {task.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
