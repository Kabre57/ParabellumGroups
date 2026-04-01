import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, BarChart3, Users } from 'lucide-react';
import type { CampaignStatsSummary } from '@/types/campaigns';

interface CampaignStatsProps {
  stats: CampaignStatsSummary;
}

export function CampaignStats({ stats }: CampaignStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total campagnes</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Toutes campagnes confondues</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Envoyées</CardTitle>
          <Send className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.sent}</div>
          <p className="text-xs text-muted-foreground">Campagnes actives</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux d'ouverture moyen</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgOpenRate}%</div>
          <p className="text-xs text-muted-foreground">Sur campagnes envoyées</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux de clic moyen</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgClickRate}%</div>
          <p className="text-xs text-muted-foreground">Engagement des lecteurs</p>
        </CardContent>
      </Card>
    </div>
  );
}
