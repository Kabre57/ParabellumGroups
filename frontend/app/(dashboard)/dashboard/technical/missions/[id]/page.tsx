'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Users, Wrench } from 'lucide-react';
import { useParams } from 'next/navigation';
import { technicalService } from '@/shared/api/technical';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const statusColors: Record<string, string> = {
  PLANIFIEE: 'bg-blue-100 text-blue-800',
  EN_COURS: 'bg-yellow-100 text-yellow-800',
  SUSPENDUE: 'bg-orange-100 text-orange-800',
  TERMINEE: 'bg-green-100 text-green-800',
  ANNULEE: 'bg-red-100 text-red-800',
};

const prioriteColors: Record<string, string> = {
  BASSE: 'bg-gray-100 text-gray-800',
  MOYENNE: 'bg-blue-100 text-blue-800',
  HAUTE: 'bg-orange-100 text-orange-800',
  URGENTE: 'bg-red-100 text-red-800',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-FR');
};

const formatCurrency = (amount?: number | null) => {
  if (!amount) return '0 F CFA';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} F CFA`;
};

export default function MissionDetailPage() {
  const params = useParams();
  const missionId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['technical-mission-detail', missionId],
    queryFn: () => technicalService.getMission(String(missionId)),
    enabled: Boolean(missionId),
  });

  const resolved = (data as any)?.data ?? data;
  const mission = resolved?.data ?? resolved;

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Impossible de charger la mission.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-2 pl-0">
            <Link href="/dashboard/technical/missions">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux missions
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{mission.titre || mission.numeroMission}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mission {mission.numeroMission}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`px-2 py-1 text-xs ${statusColors[mission.status] || 'bg-gray-100 text-gray-800'}`}>
            {mission.status}
          </Badge>
          <Badge className={`px-2 py-1 text-xs ${prioriteColors[mission.priorite] || 'bg-gray-100 text-gray-800'}`}>
            {mission.priorite}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Client</div>
              <div className="text-sm font-semibold">{mission.clientNom || '-'}</div>
              <div className="text-xs text-muted-foreground">{mission.clientContact || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Budget estimé</div>
              <div className="text-sm font-semibold">{formatCurrency(mission.budgetEstime)}</div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Période</div>
                <div className="text-sm font-semibold">
                  {formatDate(mission.dateDebut)} → {formatDate(mission.dateFin)}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Adresse</div>
                <div className="text-sm font-semibold">{mission.adresse || '-'}</div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="text-sm font-semibold">{mission.description || '-'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Techniciens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(mission.techniciens || []).length === 0 && (
              <div className="text-sm text-muted-foreground">Aucun technicien assigné.</div>
            )}
            {(mission.techniciens || []).map((item: any) => (
              <div key={item.id || item.technicienId} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold">
                  {item.technicien?.prenom} {item.technicien?.nom}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            Interventions liées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(mission.interventions || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune intervention pour cette mission.</div>
          ) : (
            <div className="space-y-3">
              {(mission.interventions || []).map((intervention: any) => (
                <div key={intervention.id} className="rounded-lg border px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{intervention.titre}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(intervention.dateDebut)} → {formatDate(intervention.dateFin)}
                      </div>
                    </div>
                    <Badge className="text-xs">{intervention.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
