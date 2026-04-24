import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PhoneCall, Mail, MapPin, FileText } from 'lucide-react';
import type { CampagneMail } from '@/shared/api/communication';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type RelanceTask = {
  id: string;
  campaignName: string;
  channel: 'EMAIL' | 'PHONE' | 'VISIT';
  dueAt: Date;
  label: string;
  note?: string;
  status?: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  report?: string;
  outcome?: 'JOINT' | 'MESSAGE' | 'A_RAPPELER' | 'INJOIGNABLE' | 'RDV_PLANIFIE';
  campaignId: string;
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

const OUTCOME_LABELS: Record<
  NonNullable<RelanceTask['outcome']>,
  string
> = {
  JOINT: 'Joint',
  MESSAGE: 'Message laisse',
  A_RAPPELER: 'A rappeler',
  INJOIGNABLE: 'Injoignable',
  RDV_PLANIFIE: 'RDV planifie',
};

const formatDate = (value: Date) =>
  value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const getStatusBadge = (dueAt: Date) => {
  const now = new Date();
  const diffDays = Math.ceil((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: 'En retard', variant: 'destructive' as const };
  }
  if (diffDays === 0) {
    return { label: 'Aujourd’hui', variant: 'default' as const };
  }
  if (diffDays <= 3) {
    return { label: `J+${diffDays}`, variant: 'secondary' as const };
  }
  return { label: `Dans ${diffDays} j`, variant: 'outline' as const };
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

interface RelanceTasksProps {
  campaigns: CampagneMail[];
  onUpdateStep?: (
    campaignId: string,
    step: number,
    updates: { status?: string; report?: string; outcome?: string }
  ) => void;
}

export function RelanceTasks({ campaigns, onUpdateStep }: RelanceTasksProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<RelanceTask | null>(null);
  const [status, setStatus] = useState('A_FAIRE');
  const [report, setReport] = useState('');
  const [outcome, setOutcome] = useState('JOINT');

  const tasks = useMemo(() => {
    const rows: RelanceTask[] = [];
    campaigns.forEach((campaign) => {
      const baseDate = new Date(campaign.dateEnvoi || campaign.createdAt || Date.now());
      const sequence = Array.isArray(campaign.sequence) ? campaign.sequence : [];
      sequence.forEach((step: any) => {
        const channel = (step?.channel || 'EMAIL') as RelanceTask['channel'];
        if (!channel) return;
        if (channel === 'EMAIL' && step?.step === 1) return;
        const stepNumber = Number(step?.step || 0);
        const delayDays = Number(step?.delayDays || 0);
        rows.push({
          id: `${campaign.id}-${stepNumber || Math.random()}`,
          campaignId: campaign.id,
          campaignName: campaign.nom,
          channel,
          dueAt: addDays(baseDate, delayDays),
          label: `${CHANNEL_LABELS[channel]} ${stepNumber || ''}`.trim(),
          note: step?.note,
          status: step?.status,
          report: step?.report,
          outcome: step?.outcome,
          step: stepNumber,
        });
      });
    });
    return rows.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  }, [campaigns]);

  const stats = useMemo(() => {
    const now = new Date();
    const overdue = tasks.filter((task) => task.dueAt < now && task.status !== 'TERMINEE');
    const today = tasks.filter((task) => {
      const sameDay = task.dueAt.toDateString() === now.toDateString();
      return sameDay && task.status !== 'TERMINEE';
    });
    const byChannel = tasks.reduce(
      (acc, task) => {
        acc[task.channel] += 1;
        return acc;
      },
      { EMAIL: 0, PHONE: 0, VISIT: 0 } as Record<RelanceTask['channel'], number>
    );
    return {
      total: tasks.length,
      overdue: overdue.length,
      today: today.length,
      byChannel,
    };
  }, [tasks]);

  const reminders = useMemo(() => {
    const now = new Date();
    const upcoming = tasks
      .filter((task) => task.status !== 'TERMINEE')
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    const nextByChannel = { EMAIL: null, PHONE: null, VISIT: null } as Record<
      RelanceTask['channel'],
      RelanceTask | null
    >;
    upcoming.forEach((task) => {
      if (!nextByChannel[task.channel]) {
        nextByChannel[task.channel] = task;
      }
    });

    const dueSoon = upcoming.filter((task) => {
      const diffDays = (task.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 3;
    });

    return {
      nextByChannel,
      dueSoon,
    };
  }, [tasks]);

  const callTasks = tasks.filter((task) => task.channel === 'PHONE');
  const emailTasks = tasks.filter((task) => task.channel === 'EMAIL');
  const visitTasks = tasks.filter((task) => task.channel === 'VISIT');

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
        Aucune relance multi-canal planifiée pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-muted-foreground">Relances totales</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-muted-foreground">A faire aujourd&apos;hui</div>
          <div className="text-2xl font-semibold">{stats.today}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-muted-foreground">En retard</div>
          <div className="text-2xl font-semibold text-red-600">{stats.overdue}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-muted-foreground">Canaux</div>
          <div className="mt-1 text-sm">
            Email: {stats.byChannel.EMAIL} · Appels: {stats.byChannel.PHONE} · Visites: {stats.byChannel.VISIT}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold">Rappels automatiques</div>
          <div className="text-xs text-muted-foreground">
            Prochains rappels declenches automatiquement par canal.
          </div>
        </div>
        <div className="grid gap-3 px-4 py-3 md:grid-cols-3">
          {(['EMAIL', 'PHONE', 'VISIT'] as RelanceTask['channel'][]).map((channel) => {
            const nextTask = reminders.nextByChannel[channel];
            return (
              <div key={channel} className="rounded-lg border px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {CHANNEL_ICON[channel]}
                  {CHANNEL_LABELS[channel]}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {nextTask
                    ? `Prochain rappel: ${formatDate(nextTask.dueAt)}`
                    : 'Aucun rappel planifie'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Rappels a venir sous 3 jours: {reminders.dueSoon.length}
        </div>
      </div>

      <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold">Relances à faire</div>
        <div className="text-xs text-muted-foreground">
          Actions multi-canal issues des campagnes programmées.
        </div>
      </div>
      <div className="divide-y">
        {tasks.slice(0, 12).map((task) => {
          const badge = getStatusBadge(task.dueAt);
          return (
            <div key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {CHANNEL_ICON[task.channel]}
                {task.label}
              </div>
              <div className="text-sm text-muted-foreground">{task.campaignName}</div>
              <div className="text-sm">{formatDate(task.dueAt)}</div>
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {task.status ? (
                <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
              ) : null}
              {task.outcome && task.channel === 'PHONE' ? (
                <Badge variant="secondary">{OUTCOME_LABELS[task.outcome]}</Badge>
              ) : null}
              {(task.channel === 'PHONE' || task.channel === 'VISIT') && onUpdateStep ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => {
                    setCurrentTask(task);
                    setStatus(task.status || 'A_FAIRE');
                    setReport(task.report || '');
                    setOutcome(task.outcome || 'JOINT');
                    setDialogOpen(true);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Compte-rendu
                </Button>
              ) : null}
              {task.note ? (
                <div className="w-full text-xs text-muted-foreground">{task.note}</div>
              ) : null}
              {task.report ? (
                <div className="w-full rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Compte-rendu: {task.report}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold">Appels à effectuer</div>
          <div className="text-xs text-muted-foreground">
            Suivi telephonique avec statut et compte-rendu.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Campagne</th>
                <th className="px-4 py-3 font-medium">Echeance</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Resultat</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {callTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Aucun appel planifie.
                  </td>
                </tr>
              ) : (
                callTasks.slice(0, 8).map((task) => (
                  <tr key={task.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{task.campaignName}</td>
                    <td className="px-4 py-3">{formatDate(task.dueAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{(task.status || 'A_FAIRE').replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {task.outcome ? OUTCOME_LABELS[task.outcome] : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {onUpdateStep ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCurrentTask(task);
                            setStatus(task.status || 'A_FAIRE');
                            setReport(task.report || '');
                            setOutcome(task.outcome || 'JOINT');
                            setDialogOpen(true);
                          }}
                        >
                          Mettre a jour
                        </Button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold">Emails a envoyer</div>
            <div className="text-xs text-muted-foreground">Relances email planifiees.</div>
          </div>
          <div className="divide-y">
            {emailTasks.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Aucun email planifie.</div>
            ) : (
              emailTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{task.campaignName}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</div>
                  </div>
                  <Badge variant="outline">{(task.status || 'A_FAIRE').replace('_', ' ')}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold">Visites a realiser</div>
            <div className="text-xs text-muted-foreground">Relances terrain programmees.</div>
          </div>
          <div className="divide-y">
            {visitTasks.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Aucune visite planifiee.</div>
            ) : (
              visitTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{task.campaignName}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</div>
                  </div>
                  <Badge variant="outline">{(task.status || 'A_FAIRE').replace('_', ' ')}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Relance telephonique</DialogTitle>
            <DialogDescription>
              Mettez a jour le statut et le compte-rendu de la relance.
            </DialogDescription>
          </DialogHeader>
          {currentTask ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">{currentTask.campaignName}</div>
              <div className="text-xs text-muted-foreground">{currentTask.label}</div>
              <div>
                <label className="block text-xs font-medium mb-1">Statut</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="A_FAIRE">A faire</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="TERMINEE">Terminee</option>
                  <option value="ANNULEE">Annulee</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Resultat de l'appel</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                >
                  <option value="JOINT">Joint</option>
                  <option value="MESSAGE">Message laisse</option>
                  <option value="A_RAPPELER">A rappeler</option>
                  <option value="INJOIGNABLE">Injoignable</option>
                  <option value="RDV_PLANIFIE">RDV planifie</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Compte-rendu</label>
                <Textarea
                  value={report}
                  onChange={(event) => setReport(event.target.value)}
                  placeholder="Resumer l'appel, objections, prochaine action..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (onUpdateStep) {
                      onUpdateStep(currentTask.campaignId, currentTask.step, { status, report, outcome });
                    }
                    setDialogOpen(false);
                  }}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
