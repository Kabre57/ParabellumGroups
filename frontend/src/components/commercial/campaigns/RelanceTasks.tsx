import { useMemo } from 'react';
import { PhoneCall, Mail, MapPin } from 'lucide-react';
import type { CampagneMail } from '@/shared/api/communication';
import { Badge } from '@/components/ui/badge';

type RelanceTask = {
  id: string;
  campaignName: string;
  channel: 'EMAIL' | 'PHONE' | 'VISIT';
  dueAt: Date;
  label: string;
  note?: string;
};

const CHANNEL_LABELS: Record<RelanceTask['channel'], string> = {
  EMAIL: 'Email',
  PHONE: 'Appel',
  VISIT: 'Visite',
};

const CHANNEL_ICON: Record<RelanceTask['channel'], JSX.Element> = {
  EMAIL: <Mail className="h-4 w-4 text-blue-600" />,
  PHONE: <PhoneCall className="h-4 w-4 text-amber-600" />,
  VISIT: <MapPin className="h-4 w-4 text-emerald-600" />,
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
}

export function RelanceTasks({ campaigns }: RelanceTasksProps) {
  const tasks = useMemo(() => {
    const rows: RelanceTask[] = [];
    campaigns.forEach((campaign) => {
      const baseDate = new Date(campaign.dateEnvoi || campaign.createdAt || Date.now());
      const sequence = Array.isArray(campaign.sequence) ? campaign.sequence : [];
      sequence.forEach((step: any) => {
        const channel = (step?.channel || 'EMAIL') as RelanceTask['channel'];
        if (!channel) return;
        if (channel === 'EMAIL' && step?.step === 1) return;
        const delayDays = Number(step?.delayDays || 0);
        rows.push({
          id: `${campaign.id}-${step?.step || Math.random()}`,
          campaignName: campaign.nom,
          channel,
          dueAt: addDays(baseDate, delayDays),
          label: `${CHANNEL_LABELS[channel]} ${step?.step || ''}`.trim(),
          note: step?.note,
        });
      });
    });
    return rows.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()).slice(0, 12);
  }, [campaigns]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
        Aucune relance multi-canal planifiée pour le moment.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold">Relances à faire</div>
        <div className="text-xs text-muted-foreground">
          Actions multi-canal issues des campagnes programmées.
        </div>
      </div>
      <div className="divide-y">
        {tasks.map((task) => {
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
              {task.note ? (
                <div className="w-full text-xs text-muted-foreground">{task.note}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
